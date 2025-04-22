export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          username: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
        }
        Insert: {
          id: string
          created_at?: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          receiver_id: string
          content: string
          read: boolean
          file_url: string | null
          file_type: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          receiver_id: string
          content: string
          read?: boolean
          file_url?: string | null
          file_type?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          read?: boolean
          file_url?: string | null
          file_type?: string | null
        }
      }
      groups: {
        Row: {
          id: string
          created_at: string
          name: string
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          created_by?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string
          created_at: string
          file_url: string | null
          file_type: string | null
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content: string
          created_at?: string
          file_url?: string | null
          file_type?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          file_url?: string | null
          file_type?: string | null
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string | null
          group_message_id: string | null
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          group_message_id?: string | null
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          group_message_id?: string | null
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}