-- ================================================
-- 1. PROFILES TABLE (linked to Supabase auth.users)
-- ================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false
);

-- ================================================
-- 2. MESSAGES TABLE (1-on-1 private chat)
-- ================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  file_url text,
  file_type text
);

-- Optional: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);

-- ================================================
-- 3. RLS (Row Level Security)
-- ================================================
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. RLS POLICIES
-- ================================================

-- === Profiles Table ===
-- Allow any user to view all profiles
CREATE POLICY "Users can view other profiles"
  ON profiles
  FOR SELECT
  USING (true);

-- Allow a user to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- === Messages Table ===
-- Allow sender to send messages
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Allow sender and receiver to view messages
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow sender to update their own messages (e.g. edit or delete)
CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- ================================================
-- 5. FILE UPLOADS (Supabase Storage Bucket)
-- ================================================

-- Create a storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload files to their own folders
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public access to download files (read-only)
CREATE POLICY "Anyone can read chat attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments');
