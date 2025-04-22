import { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { CircleUser, UserCircle as LoaderCircle } from 'lucide-react';

type UserListProps = {
  className?: string;
};

export function UserList({ className = '' }: UserListProps) {
  const {
    contacts,
    activeChat,
    loadingContacts,
    setActiveChat,
    loadContacts,
  } = useChatStore();

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Contacts</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingContacts ? (
          <div className="flex items-center justify-center h-full">
            <LoaderCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <CircleUser className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">No contacts found</p>
          </div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <button
                  className={`w-full text-left p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150 ${
                    activeChat === contact.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500'
                      : ''
                  }`}
                  onClick={() => setActiveChat(contact.id)}
                >
                  <div className="relative flex-shrink-0">
                    {contact.avatar_url ? (
                      <img
                        src={contact.avatar_url}
                        alt={contact.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium text-sm">
                          {contact.username.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {contact.full_name || contact.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {contact.username}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}