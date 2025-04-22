import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';

interface User {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  last_seen?: string;
  status?: 'online' | 'offline';
}

export function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { setActiveChat } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch all users
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, last_seen')
          .neq('id', user.id) // Exclude current user
          .order('username', { ascending: true });

        if (error) {
          console.error('Error fetching users:', error);
          throw error;
        }

        // Add mock online status for demonstration
        const usersWithStatus = data?.map(user => ({
          ...user,
          status: Math.random() > 0.5 ? 'online' as const : 'offline' as const
        })) || [];

        setUsers(usersWithStatus);
      } catch (err: any) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Set up real-time subscription for user status changes
    const userStatusSubscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
        payload => {
          // Update the user in the list if their status changes
          setUsers(prevUsers => 
            prevUsers.map(u => 
              u.id === payload.new.id ? { ...u, ...payload.new } : u
            )
          );
        }
      )
      .subscribe();

    return () => {
      userStatusSubscription.unsubscribe();
    };
  }, [user, navigate]);

  const startChat = (userId: string) => {
    setActiveChat(userId);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <header className="px-4 py-3 bg-indigo-600 dark:bg-indigo-800">
          <h1 className="text-xl font-bold text-white">Chats</h1>
        </header>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>No users found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <li 
                key={user.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => startChat(user.id)}
              >
                <div className="flex items-center p-4">
                  <div className="relative">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium text-sm">
                          {user.username.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span 
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    ></span>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || user.username}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.last_seen ? new Date(user.last_seen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{user.username} • {user.status === 'online' ? 'online' : 'offline'}
                      </p>
                      <div className="flex space-x-1">
                        <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default UserListPage;