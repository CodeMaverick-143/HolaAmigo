-- Add username column to profiles (if not already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- ========================
-- 1. Groups Table
-- ========================
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL
);

-- ========================
-- 2. Group Members Table
-- ========================
CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ========================
-- 3. Group Messages Table
-- ========================
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  file_url text,
  file_type text
);

-- ========================
-- 4. Message Reactions Table
-- ========================
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  group_message_id uuid REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT one_reference CHECK (
    (message_id IS NOT NULL AND group_message_id IS NULL) OR
    (message_id IS NULL AND group_message_id IS NOT NULL)
  )
);

-- ========================
-- 5. Enable RLS
-- ========================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- ========================
-- 6. Policies: Groups
-- ========================

CREATE POLICY "Users can view groups they are members of"
  ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ========================
-- 7. Policies: Group Members
-- ========================

CREATE POLICY "Users can view group members"
  ON group_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can manage members"
  ON group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

-- ========================
-- 8. Policies: Group Messages
-- ========================

CREATE POLICY "Group members can view messages"
  ON group_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON group_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- ========================
-- 9. Policies: Message Reactions
-- ========================

CREATE POLICY "Users can view reactions"
  ON message_reactions
  FOR SELECT
  USING (
    (
      message_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM messages
        WHERE messages.id = message_reactions.message_id
        AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
      )
    ) OR (
      group_message_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = (
          SELECT group_id FROM group_messages
          WHERE group_messages.id = message_reactions.group_message_id
        )
        AND group_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
