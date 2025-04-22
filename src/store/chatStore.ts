import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Message = Database['public']['Tables']['messages']['Row'] & {
  reply_to?: {
    id: string;
    content: string;
  } | null;
};

interface ChatState {
  contacts: Profile[];
  messages: Message[];
  activeChat: string | null;
  isTyping: boolean;
  loadingMessages: boolean;
  loadingContacts: boolean;
  fileUploading: boolean;
  setActiveChat: (userId: string) => void;
  loadContacts: () => Promise<void>;
  loadMessages: (contactId: string) => Promise<void>;
  getUserProfile: (userId: string) => Promise<Profile | null>;
  sendMessage: (receiverId: string, content: string, file?: File, replyTo?: { id: string; content: string }) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  setTyping: (typing: boolean) => void;
  subscribeToMessages: () => void;
  subscribeToTyping: () => void;
  cleanupSubscriptions: () => void;
}

export const useChatStore = create<ChatState>((set, get) => {
  let messageSubscription: any = null;
  let typingSubscription: any = null;
  
  return {
    contacts: [],
    messages: [],
    activeChat: null,
    isTyping: false,
    loadingMessages: false,
    loadingContacts: false,
    fileUploading: false,
    
    setActiveChat: (userId) => {
      set({ activeChat: userId });
      if (userId) {
        get().loadMessages(userId);
      }
    },
    
    loadContacts: async () => {
      set({ loadingContacts: true });
      
      // First get the current user's id
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ loadingContacts: false });
        return;
      }
      
      // Fetch all profiles except the current user's
      const { data, error } = await supabase
        .from('profiles')
        .select('id, created_at, username, full_name, avatar_url, is_admin')
        .neq('id', session.user.id)
        .order('username', { ascending: true });
        
      if (error) {
        console.error('Error loading contacts:', error);
      } else {
        // Ensure the data matches the Profile type
        set({ contacts: data || [] });
      }
      
      set({ loadingContacts: false });
    },
    
    loadMessages: async (contactId) => {
      set({ loadingMessages: true });
      
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;
      if (!session) {
        set({ loadingMessages: false });
        return;
      }
      
      const currentUserId = session.user.id;
      
      // Fetch messages between current user and the selected contact
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error loading messages:', error);
      } else {
        // Filter to only get messages between these two users
        const filteredMessages = data?.filter(
          msg => 
            (msg.sender_id === currentUserId && msg.receiver_id === contactId) || 
            (msg.sender_id === contactId && msg.receiver_id === currentUserId)
        ) || [];
        
        set({ messages: filteredMessages });
        
        // Mark received messages as read
        const unreadMessageIds = filteredMessages
          .filter(msg => msg.receiver_id === currentUserId && !msg.read)
          .map(msg => msg.id);
          
        if (unreadMessageIds.length > 0) {
          get().markAsRead(unreadMessageIds);
        }
      }
      
      set({ loadingMessages: false });
    },
    
    // Get a single user profile by ID using maybeSingle() to avoid 406 errors
    getUserProfile: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(); // Using maybeSingle instead of single to avoid 406 error
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return null;
        }
        
        return data;
      } catch (error) {
        console.error('Error in getUserProfile:', error);
        return null;
      }
    },
    
    sendMessage: async (receiverId, content, file, replyTo) => {
      const sessionResponse = await supabase.auth.getSession();
      const session = sessionResponse.data.session;
      if (!session) return;
      
      const currentUserId = session.user.id;
      
      let fileUrl = null;
      let fileType = null;
      
      // Upload file if provided
      if (file) {
        set({ fileUploading: true });
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) {
          console.error('Error uploading file:', error);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(data.path);
            
          fileUrl = publicUrl;
          fileType = file.type;
        }
        
        set({ fileUploading: false });
      }
      
      // Prepare message data
      const messageData: any = {
        sender_id: currentUserId,
        receiver_id: receiverId,
        content,
        file_url: fileUrl,
        file_type: fileType,
        read: false
      };
      
      // Add reply_to metadata if replying to a message
      if (replyTo) {
        // In a real app, you would store this in a separate table or as JSON metadata
        // For this demo, we'll add it as a custom field that will be handled in the UI
        messageData.reply_to = replyTo;
      }
      
      // Send message
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (error) {
        console.error('Error sending message:', error);
      } else {
        // Reload messages to show the new message
        get().loadMessages(receiverId);
      }
    },
    
    markAsRead: async (messageIds) => {
      if (messageIds.length === 0) return;
      
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', messageIds);
        
      if (error) {
        console.error('Error marking messages as read:', error);
      }
    },
    
    setTyping: (typing) => {
      set({ isTyping: typing });
    },
    
    subscribeToMessages: () => {
      // Clean up any existing subscription
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
      
      // Subscribe to new messages
      messageSubscription = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages' 
          },
          async (payload) => {
            const { activeChat } = get();
            const newMessage = payload.new as Message;
            
            // Only update if we're in the relevant chat
            const sessionResponse = await supabase.auth.getSession();
            const session = sessionResponse.data.session;
            if (!session) return;
            
            const currentUserId = session.user.id;
            
            if (
              activeChat && 
              ((newMessage.sender_id === currentUserId && newMessage.receiver_id === activeChat) || 
              (newMessage.sender_id === activeChat && newMessage.receiver_id === currentUserId))
            ) {
              // Add new message to the list
              set(state => ({ 
                messages: [...state.messages, newMessage]
              }));
              
              // If we received a message, mark it as read
              if (newMessage.receiver_id === currentUserId && !newMessage.read) {
                get().markAsRead([newMessage.id]);
              }
            }
          }
        )
        .subscribe();
    },
    
    subscribeToTyping: () => {
      // This would be implemented using Supabase Presence or a similar real-time feature
      // For simplicity, we're not implementing the actual subscription here
      typingSubscription = null;
    },
    
    cleanupSubscriptions: () => {
      if (messageSubscription) {
        messageSubscription.unsubscribe();
        messageSubscription = null;
      }
      
      if (typingSubscription) {
        typingSubscription.unsubscribe();
        typingSubscription = null;
      }
    },
  };
});