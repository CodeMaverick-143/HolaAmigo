import { useEffect, useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { FileText, Paperclip, CheckCircle, Check, Clock, Smile, MoreVertical, Reply, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface Reaction {
  emoji: string;
  userId: string;
}

type Message = {
  id: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  file_url: string | null;
  file_type: string | null;
  reply_to?: {
    id: string;
    content: string;
  } | null;
};

interface MessageWithReactions extends Message {
  reactions?: Reaction[];
}

export function MessageList() {
  const { user } = useAuthStore();
  const { messages: originalMessages, activeChat, loadingMessages, isTyping } = useChatStore();
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<number>(20); // Start with 20 messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messages.length <= visibleMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, visibleMessages]);
  
  // Load more messages when scrolling to the top
  const handleScroll = useCallback(() => {
    const messageList = messageListRef.current;
    if (messageList && messageList.scrollTop < 50 && visibleMessages < messages.length) {
      // When user scrolls to the top, load more messages
      setVisibleMessages(prev => Math.min(prev + 20, messages.length));
    }
  }, [visibleMessages, messages.length]);
  
  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.addEventListener('scroll', handleScroll);
      return () => messageList.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Update messages with reactions
  useEffect(() => {
    // Add empty reactions array to each message
    const messagesWithReactions = originalMessages.map(msg => ({
      ...msg,
      reactions: []
    }));
    setMessages(messagesWithReactions);
  }, [originalMessages]);
  
  // Close reaction picker and context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle message selection
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessage(selectedMessage === messageId ? null : messageId);
  };
  
  // Handle message reply
  const handleReply = (message: MessageWithReactions) => {
    setShowContextMenu(null);
    
    // Emit a custom event that MessageInput can listen for
    const replyEvent = new CustomEvent('message-reply', {
      detail: { messageId: message.id, content: message.content }
    });
    document.dispatchEvent(replyEvent);
    
    // Show a notification to the user
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.innerHTML = `<p>Replying to message</p>`;
    document.body.appendChild(notification);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
      notification.classList.add('animate-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };
  
  // Handle message deletion
  const handleDelete = (messageId: string) => {
    // Filter out the deleted message
    const updatedMessages = messages.filter(msg => msg.id !== messageId);
    setMessages(updatedMessages);
    setShowContextMenu(null);
    // In a real app, you would also delete from the database
  };
  
  // Add reaction to a message
  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      // Find the message and update its reactions
      const updatedMessages = messages.map(msg => {
        if (msg.id === messageId) {
          // Check if user already reacted with this emoji
          const existingReactionIndex = msg.reactions?.findIndex(
            r => r.userId === user.id && r.emoji === emoji
          );
          
          if (existingReactionIndex !== undefined && existingReactionIndex >= 0) {
            // Remove the reaction if it already exists
            const newReactions = [...(msg.reactions || [])];
            newReactions.splice(existingReactionIndex, 1);
            return { ...msg, reactions: newReactions };
          } else {
            // Add the new reaction
            return { 
              ...msg, 
              reactions: [...(msg.reactions || []), { emoji, userId: user.id }] 
            };
          }
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      setShowReactionPicker(null);
      
      // TODO: In a real app, you would save this to your database
      // For now, we're just updating the local state
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  // Render message status indicator
  const renderMessageStatus = (message: MessageWithReactions, isCurrentUser: boolean) => {
    if (!isCurrentUser) return null;
    
    return (
      <span className="ml-2 inline-flex items-center">
        {message.read ? (
          <CheckCircle className="w-3 h-3 text-green-500" />
        ) : message.created_at ? (
          <Check className="w-3 h-3 text-gray-400" />
        ) : (
          <Clock className="w-3 h-3 text-gray-400" />
        )}
      </span>
    );
  };

  if (!activeChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Welcome to Hola Chat
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Select a conversation from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  if (loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col space-y-4 w-3/4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 self-end"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 self-end"></div>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { [date: string]: typeof messages } = {};
  messages.forEach((message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  // Helper function to render file attachments
  const renderAttachment = (message: typeof messages[0]) => {
    if (!message.file_url) return null;

    // Check if it's an image
    if (message.file_type?.startsWith('image/')) {
      return (
        <div className="mt-2 max-w-xs">
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg overflow-hidden border dark:border-gray-700"
          >
            <img
              src={message.file_url}
              alt="Attachment"
              className="w-full h-auto max-h-48 object-cover"
              loading="lazy"
            />
          </a>
        </div>
      );
    }

    // PDF or document
    if (message.file_type?.includes('pdf') || message.file_type?.includes('document')) {
      return (
        <div className="mt-2">
          <a
            href={message.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {message.file_url.split('/').pop()}
            </span>
          </a>
        </div>
      );
    }

    // Other file types
    return (
      <div className="mt-2">
        <a
          href={message.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Paperclip className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {message.file_url.split('/').pop()}
          </span>
        </a>
      </div>
    );
  };

  // Listen for reply cancellation from MessageInput
  useEffect(() => {
    const handleReplyCancelled = () => {
      // Handle any UI updates when reply is cancelled
      // This could include clearing selected messages, etc.
    };
    
    document.addEventListener('reply-cancelled', handleReplyCancelled);
    return () => {
      document.removeEventListener('reply-cancelled', handleReplyCancelled);
    };
  }, []);
  
  return (
    <div 
      ref={messageListRef}
      className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900">
      {/* Show load more button if there are more messages to load */}
      {visibleMessages < messages.length && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => setVisibleMessages(prev => Math.min(prev + 20, messages.length))}
            className="px-4 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/30 transition-colors"
          >
            Load more messages
          </button>
        </div>
      )}
      
      {Object.keys(groupedMessages).map((date) => (
        <div key={date} className="space-y-4">
          <div className="flex justify-center">
            <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
              {new Date().toDateString() === date
                ? 'Today'
                : format(new Date(date), 'MMMM d, yyyy')}
            </div>
          </div>

          {groupedMessages[date]
            // Apply lazy loading - only show the most recent messages
            .slice(-Math.min(visibleMessages, groupedMessages[date].length))
            .map((message) => {
              const isCurrentUser = message.sender_id === user?.id;
              const isSelected = selectedMessage === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group relative`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowContextMenu(message.id);
                  }}
                >
                <div
                  className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-2 animate-fade-in ${
                    isCurrentUser
                      ? isSelected 
                        ? 'bg-indigo-700 text-white ring-2 ring-indigo-300 dark:ring-indigo-500' 
                        : 'bg-indigo-600 text-white'
                      : isSelected
                        ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border dark:border-gray-700 ring-2 ring-indigo-300 dark:ring-indigo-500'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border dark:border-gray-700'
                  }`}
                  onClick={() => toggleMessageSelection(message.id)}
                >
                  {/* Reply reference if this message is a reply to another */}
                  {message.reply_to && (
                    <div className="mb-2 p-2 border-l-4 border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded text-xs text-gray-600 dark:text-gray-400">
                      <div className="font-medium">Reply to</div>
                      <div className="truncate">{message.reply_to.content}</div>
                    </div>
                  )}
                  <div className="break-words">{message.content}</div>
                  {renderAttachment(message)}
                  
                  {/* Message reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                        const count = message.reactions?.filter(r => r.emoji === emoji).length || 0;
                        const hasUserReacted = message.reactions?.some(r => r.emoji === emoji && r.userId === user?.id);
                        return (
                          <button 
                            key={emoji} 
                            onClick={() => addReaction(message.id, emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded-full transition-all ${isCurrentUser 
                              ? hasUserReacted 
                                ? 'bg-indigo-500 hover:bg-indigo-600' 
                                : 'bg-indigo-700 hover:bg-indigo-800' 
                              : hasUserReacted 
                                ? 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500' 
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                            title={`${count} ${count === 1 ? 'reaction' : 'reactions'}`}
                          >
                            {emoji} {count > 1 && <span>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  <div
                    className={`text-xs mt-1 flex items-center ${
                      isCurrentUser ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <span>{format(new Date(message.created_at), 'h:mm a')}</span>
                    {renderMessageStatus(message, isCurrentUser)}
                    
                    <div className="ml-auto flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {/* Reply button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply(message);
                        }}
                        className="hover:text-indigo-400 dark:hover:text-indigo-300"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      
                      {/* Reaction button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionPicker(showReactionPicker === message.id ? null : message.id);
                        }}
                        className="hover:text-indigo-400 dark:hover:text-indigo-300"
                        title="Add reaction"
                      >
                        <Smile className="w-3 h-3" />
                      </button>
                      
                      {/* More options button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowContextMenu(showContextMenu === message.id ? null : message.id);
                        }}
                        className="hover:text-indigo-400 dark:hover:text-indigo-300"
                        title="More options"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Reaction picker */}
                    {showReactionPicker === message.id && (
                      <div 
                        ref={reactionPickerRef}
                        className="absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 p-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex space-x-2">
                          {['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🙏', '🔥', '💯'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Context menu */}
                    {showContextMenu === message.id && (
                      <div 
                        ref={contextMenuRef}
                        className="absolute top-0 right-0 mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-10 w-36"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleReply(message)}
                          className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </button>
                        
                        <button
                          onClick={() => setShowReactionPicker(message.id)}
                          className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Smile className="w-4 h-4 mr-2" />
                          React
                        </button>
                        
                        {isCurrentUser && (
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200 border dark:border-gray-700 animate-pulse">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}