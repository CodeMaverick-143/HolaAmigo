import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function HomePage() {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Hola</span>
          </div>
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <MessageCircle className="h-24 w-24 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            Real-time chat made <span className="text-indigo-600 dark:text-indigo-400">simple</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Connect instantly with friends and colleagues. Send messages, share files, and stay in touch in real-time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/register"
              className="px-8 py-4 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 text-lg font-medium text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-6 px-4 sm:px-6 lg:px-8 text-center text-gray-600 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Hola Chat. All rights reserved.</p>
      </footer>
    </div>
  );
}