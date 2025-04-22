import { useEffect, useState } from 'react';
import { LogOut, Moon, Sun, User, Users, Search, Video, Phone, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useChatStore } from '../../store/chatStore';
import { supabase } from '../../lib/supabase';

type ChatHeaderProps = {
  onOpenSidebar: () => void;
};

export function ChatHeader({ onOpenSidebar }: ChatHeaderProps) {
  const { logout, user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const { activeChat, contacts } = useChatStore();
  const [activeContact, setActiveContact] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<'online' | 'offline'>('offline');
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeChat) {
      const contact = contacts.find(c => c.id === activeChat);
      setActiveContact(contact);
      
      // Simulate online status - in a real app, this would come from the server
      setOnlineStatus(Math.random() > 0.5 ? 'online' : 'offline');
      
      // Set a random last seen time for demo purposes
      if (Math.random() > 0.5) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - Math.floor(Math.random() * 60));
        setLastSeen(now.toISOString());
      } else {
        setLastSeen(null);
      }
    } else {
      setActiveContact(null);
      setOnlineStatus('offline');
      setLastSeen(null);
    }
  }, [activeChat, contacts]);
  
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  
  useEffect(() => {
    async function getProfileImage() {
      try {
        if (!user) {
          setProfileUrl(null);
          return;
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching profile:', error);
          setProfileUrl(null);
          return;
        }
        
        setProfileUrl(data?.avatar_url || null);
      } catch (error) {
        console.error('Error in getProfileImage:', error);
        setProfileUrl(null);
      }
    }
    
    getProfileImage();
  }, [user]);
  
  // Function to start a video call with the active contact
  const startVideoCall = () => {
    if (activeChat) {
      localStorage.setItem('videoCallUserId', activeChat);
      navigate(`/video-call/${activeChat}`);
    }
  };

  // Format last seen time
  const formatLastSeen = () => {
    if (!lastSeen) return null;
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center">
        <button 
          className="md:hidden mr-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <User className="w-5 h-5" />
        </button>
        
        {activeContact ? (
          <div className="flex items-center">
            <div className="relative mr-3">
              {activeContact.avatar_url ? (
                <img
                  src={activeContact.avatar_url}
                  alt={activeContact.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-indigo-700 dark:text-indigo-300 font-medium text-sm">
                    {activeContact.username.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {onlineStatus === 'online' && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {activeContact.full_name || activeContact.username}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {onlineStatus === 'online' ? (
                  <span className="text-green-500">online</span>
                ) : (
                  <span>last seen {formatLastSeen()}</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hola Chat</h1>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {activeContact && (
          <>
            <button
              onClick={() => {/* Implement search in chat */}}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Search in conversation"
              title="Search in conversation"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {/* Implement voice call */}}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Voice call"
              title="Voice call"
            >
              <Phone className="w-5 h-5" />
            </button>
            
            <button
              onClick={startVideoCall}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Video call"
              title="Video call"
            >
              <Video className="w-5 h-5" />
            </button>
          </>
        )}
        
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="View all users"
          title="View all users"
        >
          <Users className="w-5 h-5" />
        </button>
        
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="More options"
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 py-1 z-10">
              <div className="px-4 py-2 border-b dark:border-gray-700">
                <div className="flex items-center">
                  {profileUrl ? (
                    <img 
                      src={profileUrl} 
                      alt="Your profile" 
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2">
                      <span className="text-white font-medium text-sm">
                        {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Online
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}