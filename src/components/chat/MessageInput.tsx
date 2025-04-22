import { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, X, Smile, CornerUpLeft } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useChatStore } from '../../store/chatStore';

type MessageInputProps = {
  disabled?: boolean;
};

export function MessageInput({ disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{ messageId: string; content: string } | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    activeChat, 
    sendMessage, 
    setTyping,
    fileUploading,
  } = useChatStore();
  
  // Handle typing indicator
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      setTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        setTyping(false);
      }
    }, 1000);
    
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, setTyping]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Listen for reply events from MessageList
  useEffect(() => {
    const handleReply = (event: CustomEvent) => {
      setReplyTo(event.detail);
      // Focus the textarea when replying
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    };
    
    document.addEventListener('message-reply', handleReply as EventListener);
    return () => {
      document.removeEventListener('message-reply', handleReply as EventListener);
    };
  }, []);
  
  const handleSendMessage = async () => {
    if ((!message.trim() && !file) || !activeChat || disabled || fileUploading) return;
    
    try {
      // If replying to a message, include the reply_to information
      const replyToInfo = replyTo ? { id: replyTo.messageId, content: replyTo.content } : undefined;
      
      await sendMessage(activeChat, message.trim(), file || undefined, replyToInfo);
      setMessage('');
      setFile(null);
      setReplyTo(null); // Clear reply after sending
      
      // Make sure typing indicator is off
      setIsTyping(false);
      setTyping(false);
      
      // Close emoji picker if open
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
    // Don't close the picker so user can add multiple emojis
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size exceeds the 10MB limit.');
        return;
      }
      
      setFile(selectedFile);
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleCancelReply = () => {
    setReplyTo(null);
    // Emit an event to notify MessageList that reply was cancelled
    document.dispatchEvent(new CustomEvent('reply-cancelled'));
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-l-4 border-indigo-500 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1 flex items-center">
              <CornerUpLeft className="w-3 h-3 mr-1" />
              Replying to message
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {replyTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelReply}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* File attachment indicator */}
      {file && (
        <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[calc(100%-2rem)]">
            {file.name}
          </span>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="flex items-end space-x-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || fileUploading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </button>

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled || fileUploading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>
        
        <div className="flex-grow relative">
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full mb-2 z-10"
            >
              <EmojiPicker 
                onEmojiClick={handleEmojiClick} 
                searchDisabled={false}
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? "Type your reply..." : "Type a message..."}
            disabled={disabled || fileUploading}
            className={`w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200 min-h-[2.5rem] max-h-24 transition-all duration-200 ${replyTo ? 'border-l-4 border-indigo-500' : ''}`}
            rows={1}
            style={{ height: 'auto', minHeight: '2.5rem', maxHeight: '6rem' }}
          />
        </div>
        
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={(!message.trim() && !file) || disabled || fileUploading || !activeChat}
          className={`p-2 rounded-full ${
            message.trim() || file
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          } disabled:opacity-50 transition-colors`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      
      {fileUploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-indigo-600 h-1.5 rounded-full w-full animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploading file...</p>
        </div>
      )}
    </div>
  );
}