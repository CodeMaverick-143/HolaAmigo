import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { ChatHeader } from '../components/chat/ChatHeader';
import { UserList } from '../components/chat/UserList';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';

export function ChatPage() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  const { subscribeToMessages, cleanupSubscriptions } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  useEffect(() => {
    // Subscribe to real-time updates
    subscribeToMessages();
    
    // Cleanup on unmount
    return () => {
      cleanupSubscriptions();
    };
  }, [subscribeToMessages, cleanupSubscriptions]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-800">
      <ChatHeader onOpenSidebar={() => setSidebarOpen(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for mobile - hidden by default */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity md:hidden ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={`absolute inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 transform transition-transform ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Contacts</h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <UserList />
          </div>
        </div>
        
        {/* Permanent sidebar for desktop */}
        <div className="hidden md:block w-64 border-r dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
          <UserList />
        </div>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MessageList />
          <MessageInput />
        </div>
      </div>
    </div>
  );
}