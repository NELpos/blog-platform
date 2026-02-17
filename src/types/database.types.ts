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
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          custom_domain: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          custom_domain?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          custom_domain?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          workspace_id: string
          author_id: string
          title: string
          slug: string
          content_markdown: string
          cover_image_url: string | null
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          author_id: string
          title: string
          slug: string
          content_markdown?: string
          cover_image_url?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          author_id?: string
          title?: string
          slug?: string
          content_markdown?: string
          cover_image_url?: string | null
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      media: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          filename: string
          r2_key: string
          size_bytes: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          filename: string
          r2_key: string
          size_bytes: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          filename?: string
          r2_key?: string
          size_bytes?: number
          created_at?: string
        }
      }
    }
  }
}
