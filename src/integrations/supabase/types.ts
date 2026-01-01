export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          key: string
          name: string
          requirement_type: string
          requirement_value: number
          tier: string
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          requirement_type: string
          requirement_value?: number
          tier?: string
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          tier?: string
          xp_reward?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          is_sent: boolean | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          target_audience: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_sent?: boolean | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          target_audience?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_sent?: boolean | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          target_audience?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key: string
          created_at: string
          endpoint: string
          id: string
          response_code: number | null
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint: string
          id?: string
          response_code?: number | null
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          response_code?: number | null
        }
        Relationships: []
      }
      api_subscriptions: {
        Row: {
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          plan: string
          price_monthly: number
          requests_limit: number
          requests_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          price_monthly?: number
          requests_limit?: number
          requests_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          price_monthly?: number
          requests_limit?: number
          requests_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
          is_auto_bid: boolean
          is_winning: boolean
          max_bid: number | null
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
          is_auto_bid?: boolean
          is_winning?: boolean
          max_bid?: number | null
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
          is_auto_bid?: boolean
          is_winning?: boolean
          max_bid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_watchers: {
        Row: {
          auction_id: string
          created_at: string
          id: string
          notify_before_end: boolean
          notify_on_outbid: boolean
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          id?: string
          notify_before_end?: boolean
          notify_on_outbid?: boolean
          user_id: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          id?: string
          notify_before_end?: boolean
          notify_on_outbid?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_watchers_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bid_count: number
          bid_increment: number
          buy_now_price: number | null
          category: string
          condition: string
          created_at: string
          current_bid: number | null
          description: string | null
          ends_at: string
          final_price: number | null
          highest_bidder_id: string | null
          id: string
          image_url: string | null
          listing_id: string | null
          reserve_price: number | null
          seller_id: string
          starting_price: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bid_count?: number
          bid_increment?: number
          buy_now_price?: number | null
          category: string
          condition?: string
          created_at?: string
          current_bid?: number | null
          description?: string | null
          ends_at: string
          final_price?: number | null
          highest_bidder_id?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          reserve_price?: number | null
          seller_id: string
          starting_price: number
          starts_at?: string
          status?: string
          title: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bid_count?: number
          bid_increment?: number
          buy_now_price?: number | null
          category?: string
          condition?: string
          created_at?: string
          current_bid?: number | null
          description?: string | null
          ends_at?: string
          final_price?: number | null
          highest_bidder_id?: string | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          reserve_price?: number | null
          seller_id?: string
          starting_price?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_buy_config: {
        Row: {
          created_at: string
          discount_threshold: number
          id: string
          is_enabled: boolean
          max_buy_amount: number | null
          system_buyer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_threshold?: number
          id?: string
          is_enabled?: boolean
          max_buy_amount?: number | null
          system_buyer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_threshold?: number
          id?: string
          is_enabled?: boolean
          max_buy_amount?: number | null
          system_buyer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      auto_buy_logs: {
        Row: {
          created_at: string
          discount_percent: number
          error_message: string | null
          id: string
          listing_id: string | null
          listing_price: number
          market_item_id: string | null
          market_price: number
          order_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          discount_percent: number
          error_message?: string | null
          id?: string
          listing_id?: string | null
          listing_price: number
          market_item_id?: string | null
          market_price: number
          order_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          error_message?: string | null
          id?: string
          listing_id?: string | null
          listing_price?: number
          market_item_id?: string | null
          market_price?: number
          order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_buy_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_buy_logs_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_buy_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_relist_settings: {
        Row: {
          created_at: string
          current_suggested_price: number | null
          days_until_suggest: number | null
          enabled: boolean | null
          id: string
          last_reduction_at: string | null
          listing_id: string
          min_price: number | null
          original_price: number
          price_ladder_enabled: boolean | null
          price_reduction_percent: number | null
          reduction_interval_hours: number | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_suggested_price?: number | null
          days_until_suggest?: number | null
          enabled?: boolean | null
          id?: string
          last_reduction_at?: string | null
          listing_id: string
          min_price?: number | null
          original_price: number
          price_ladder_enabled?: boolean | null
          price_reduction_percent?: number | null
          reduction_interval_hours?: number | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_suggested_price?: number | null
          days_until_suggest?: number | null
          enabled?: boolean | null
          id?: string
          last_reduction_at?: string | null
          listing_id?: string
          min_price?: number | null
          original_price?: number
          price_ladder_enabled?: boolean | null
          price_reduction_percent?: number | null
          reduction_interval_hours?: number | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_relist_settings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          bid_amount: number
          category: string
          created_at: string
          expires_at: string | null
          grade: string | null
          id: string
          item_name: string
          market_item_id: string | null
          max_bid: number | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_amount: number
          category: string
          created_at?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          item_name: string
          market_item_id?: string | null
          max_bid?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_amount?: number
          category?: string
          created_at?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          item_name?: string
          market_item_id?: string | null
          max_bid?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      card_reels: {
        Row: {
          avg_watch_time: number | null
          comment_count: number | null
          completion_rate: number | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          hashtags: string[] | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          like_count: number | null
          save_count: number | null
          share_count: number | null
          sound_name: string | null
          tagged_card_id: string | null
          thumbnail_url: string | null
          title: string
          trending_score: number | null
          updated_at: string
          user_id: string
          video_url: string
          view_count: number | null
          watch_time_total: number | null
        }
        Insert: {
          avg_watch_time?: number | null
          comment_count?: number | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          save_count?: number | null
          share_count?: number | null
          sound_name?: string | null
          tagged_card_id?: string | null
          thumbnail_url?: string | null
          title: string
          trending_score?: number | null
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number | null
          watch_time_total?: number | null
        }
        Update: {
          avg_watch_time?: number | null
          comment_count?: number | null
          completion_rate?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          hashtags?: string[] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          save_count?: number | null
          share_count?: number | null
          sound_name?: string | null
          tagged_card_id?: string | null
          thumbnail_url?: string | null
          title?: string
          trending_score?: number | null
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number | null
          watch_time_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_reels_tagged_card_id_fkey"
            columns: ["tagged_card_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      card_sets: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          release_date: string | null
          series: string | null
          total_cards: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          release_date?: string | null
          series?: string | null
          total_cards?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          release_date?: string | null
          series?: string | null
          total_cards?: number
        }
        Relationships: []
      }
      card_war_votes: {
        Row: {
          card_war_id: string
          created_at: string
          id: string
          is_pro_vote: boolean | null
          payout_amount: number | null
          payout_claimed: boolean | null
          user_id: string
          vote_for: string
          vote_value: number | null
        }
        Insert: {
          card_war_id: string
          created_at?: string
          id?: string
          is_pro_vote?: boolean | null
          payout_amount?: number | null
          payout_claimed?: boolean | null
          user_id: string
          vote_for: string
          vote_value?: number | null
        }
        Update: {
          card_war_id?: string
          created_at?: string
          id?: string
          is_pro_vote?: boolean | null
          payout_amount?: number | null
          payout_claimed?: boolean | null
          user_id?: string
          vote_for?: string
          vote_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_war_votes_card_war_id_fkey"
            columns: ["card_war_id"]
            isOneToOne: false
            referencedRelation: "card_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      card_wars: {
        Row: {
          card_a_id: string | null
          card_a_image: string | null
          card_a_name: string
          card_b_id: string | null
          card_b_image: string | null
          card_b_name: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          prize_pool: number
          starts_at: string
          status: string
          winner: string | null
        }
        Insert: {
          card_a_id?: string | null
          card_a_image?: string | null
          card_a_name: string
          card_b_id?: string | null
          card_b_image?: string | null
          card_b_name: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          prize_pool?: number
          starts_at?: string
          status?: string
          winner?: string | null
        }
        Update: {
          card_a_id?: string | null
          card_a_image?: string | null
          card_a_name?: string
          card_b_id?: string | null
          card_b_image?: string | null
          card_b_name?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          prize_pool?: number
          starts_at?: string
          status?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_wars_card_a_id_fkey"
            columns: ["card_a_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_wars_card_b_id_fkey"
            columns: ["card_b_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cardboom_points: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cardboom_points_history: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_card_votes: {
        Row: {
          card_a_id: string | null
          card_a_image: string | null
          card_a_name: string
          card_a_votes: number | null
          card_a_weighted_votes: number | null
          card_b_id: string | null
          card_b_image: string | null
          card_b_name: string
          card_b_votes: number | null
          card_b_weighted_votes: number | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          status: string | null
          vote_date: string
          winner: string | null
          xp_reward: number | null
        }
        Insert: {
          card_a_id?: string | null
          card_a_image?: string | null
          card_a_name: string
          card_a_votes?: number | null
          card_a_weighted_votes?: number | null
          card_b_id?: string | null
          card_b_image?: string | null
          card_b_name: string
          card_b_votes?: number | null
          card_b_weighted_votes?: number | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          status?: string | null
          vote_date?: string
          winner?: string | null
          xp_reward?: number | null
        }
        Update: {
          card_a_id?: string | null
          card_a_image?: string | null
          card_a_name?: string
          card_a_votes?: number | null
          card_a_weighted_votes?: number | null
          card_b_id?: string | null
          card_b_image?: string | null
          card_b_name?: string
          card_b_votes?: number | null
          card_b_weighted_votes?: number | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          status?: string | null
          vote_date?: string
          winner?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_card_votes_card_a_id_fkey"
            columns: ["card_a_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_card_votes_card_b_id_fkey"
            columns: ["card_b_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      community_vote_entries: {
        Row: {
          created_at: string
          id: string
          is_pro_vote: boolean | null
          poll_id: string
          user_id: string
          vote_for: string
          vote_weight: number | null
          xp_claimed: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_pro_vote?: boolean | null
          poll_id: string
          user_id: string
          vote_for: string
          vote_weight?: number | null
          xp_claimed?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          is_pro_vote?: boolean | null
          poll_id?: string
          user_id?: string
          vote_for?: string
          vote_weight?: number | null
          xp_claimed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "community_vote_entries_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "community_card_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string | null
          participant_1: string
          participant_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          participant_1: string
          participant_2: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          participant_1?: string
          participant_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_analytics: {
        Row: {
          call_views: number | null
          creator_id: string
          date: string
          id: string
          new_followers: number | null
          page_views: number | null
          referral_clicks: number | null
          unique_visitors: number | null
          watchlist_views: number | null
        }
        Insert: {
          call_views?: number | null
          creator_id: string
          date?: string
          id?: string
          new_followers?: number | null
          page_views?: number | null
          referral_clicks?: number | null
          unique_visitors?: number | null
          watchlist_views?: number | null
        }
        Update: {
          call_views?: number | null
          creator_id?: string
          date?: string
          id?: string
          new_followers?: number | null
          page_views?: number | null
          referral_clicks?: number | null
          unique_visitors?: number | null
          watchlist_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_analytics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_applications: {
        Row: {
          bio: string | null
          categories: string[] | null
          created_at: string
          creator_name: string
          email: string
          follower_count: string | null
          handle: string
          id: string
          notes: string | null
          platform: string
          portfolio_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          categories?: string[] | null
          created_at?: string
          creator_name: string
          email: string
          follower_count?: string | null
          handle: string
          id?: string
          notes?: string | null
          platform: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          categories?: string[] | null
          created_at?: string
          creator_name?: string
          email?: string
          follower_count?: string | null
          handle?: string
          id?: string
          notes?: string | null
          platform?: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_call_followups: {
        Row: {
          call_id: string
          content: string
          created_at: string
          creator_id: string
          id: string
          price_at_followup: number
        }
        Insert: {
          call_id: string
          content: string
          created_at?: string
          creator_id: string
          id?: string
          price_at_followup: number
        }
        Update: {
          call_id?: string
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          price_at_followup?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_call_followups_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "creator_market_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_call_followups_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_followers: {
        Row: {
          creator_id: string
          followed_at: string
          follower_user_id: string
          id: string
          referral_source: string | null
        }
        Insert: {
          creator_id: string
          followed_at?: string
          follower_user_id: string
          id?: string
          referral_source?: string | null
        }
        Update: {
          creator_id?: string
          followed_at?: string
          follower_user_id?: string
          id?: string
          referral_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_followers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_market_calls: {
        Row: {
          call_type: string
          created_at: string
          creator_id: string
          current_price: number | null
          id: string
          is_public: boolean | null
          liquidity_at_call: string | null
          market_item_id: string
          outcome_status: string | null
          outcome_updated_at: string | null
          price_at_call: number
          price_change_percent: number | null
          thesis: string | null
          time_to_exit_days: number | null
          volume_at_call: number | null
        }
        Insert: {
          call_type: string
          created_at?: string
          creator_id: string
          current_price?: number | null
          id?: string
          is_public?: boolean | null
          liquidity_at_call?: string | null
          market_item_id: string
          outcome_status?: string | null
          outcome_updated_at?: string | null
          price_at_call: number
          price_change_percent?: number | null
          thesis?: string | null
          time_to_exit_days?: number | null
          volume_at_call?: number | null
        }
        Update: {
          call_type?: string
          created_at?: string
          creator_id?: string
          current_price?: number | null
          id?: string
          is_public?: boolean | null
          liquidity_at_call?: string | null
          market_item_id?: string
          outcome_status?: string | null
          outcome_updated_at?: string | null
          price_at_call?: number
          price_change_percent?: number | null
          thesis?: string | null
          time_to_exit_days?: number | null
          volume_at_call?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_market_calls_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_market_calls_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_picks: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          is_public: boolean | null
          market_item_id: string
          note: string | null
          pick_type: string
          price_at_pick: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          is_public?: boolean | null
          market_item_id: string
          note?: string | null
          pick_type: string
          price_at_pick?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          is_public?: boolean | null
          market_item_id?: string
          note?: string | null
          pick_type?: string
          price_at_pick?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_picks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_picks_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          accuracy_rate: number | null
          accurate_calls: number | null
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          creator_name: string
          follower_count: number | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          platform: string
          platform_handle: string | null
          portfolio_public: boolean | null
          referral_clicks: number | null
          specialty_categories: string[] | null
          total_calls: number | null
          total_views: number | null
          updated_at: string
          user_id: string
          username: string | null
          watchlist_public: boolean | null
        }
        Insert: {
          accuracy_rate?: number | null
          accurate_calls?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_name: string
          follower_count?: number | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          platform: string
          platform_handle?: string | null
          portfolio_public?: boolean | null
          referral_clicks?: number | null
          specialty_categories?: string[] | null
          total_calls?: number | null
          total_views?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          watchlist_public?: boolean | null
        }
        Update: {
          accuracy_rate?: number | null
          accurate_calls?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_name?: string
          follower_count?: number | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          platform?: string
          platform_handle?: string | null
          portfolio_public?: boolean | null
          referral_clicks?: number | null
          specialty_categories?: string[] | null
          total_calls?: number | null
          total_views?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          watchlist_public?: boolean | null
        }
        Relationships: []
      }
      creator_watchlist_items: {
        Row: {
          added_at: string
          id: string
          is_active: boolean | null
          market_item_id: string
          note: string | null
          price_when_added: number
          price_when_removed: number | null
          removed_at: string | null
          watchlist_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          is_active?: boolean | null
          market_item_id: string
          note?: string | null
          price_when_added: number
          price_when_removed?: number | null
          removed_at?: string | null
          watchlist_id: string
        }
        Update: {
          added_at?: string
          id?: string
          is_active?: boolean | null
          market_item_id?: string
          note?: string | null
          price_when_added?: number
          price_when_removed?: number | null
          removed_at?: string | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_watchlist_items_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "creator_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_watchlists: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          is_public: boolean | null
          slug: string
          thesis: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          is_public?: boolean | null
          slug: string
          thesis?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          is_public?: boolean | null
          slug?: string
          thesis?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_watchlists_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          api_rate: number | null
          from_currency: string
          id: string
          is_manual_override: boolean | null
          last_api_update: string | null
          rate: number
          to_currency: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_rate?: number | null
          from_currency: string
          id?: string
          is_manual_override?: boolean | null
          last_api_update?: string | null
          rate: number
          to_currency: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_rate?: number | null
          from_currency?: string
          id?: string
          is_manual_override?: boolean | null
          last_api_update?: string | null
          rate?: number
          to_currency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      daily_logins: {
        Row: {
          created_at: string
          id: string
          login_date: string
          streak_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_date?: string
          streak_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_date?: string
          streak_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      data_access_levels: {
        Row: {
          access_level: string
          created_at: string
          data_type: string
          description: string | null
          field_name: string
          id: string
        }
        Insert: {
          access_level: string
          created_at?: string
          data_type: string
          description?: string | null
          field_name: string
          id?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          data_type?: string
          description?: string | null
          field_name?: string
          id?: string
        }
        Relationships: []
      }
      discussion_comments: {
        Row: {
          accuracy_score: number | null
          collapse_reason: string | null
          content: string
          contradicted_count: number | null
          created_at: string
          discussion_id: string
          id: string
          insightful_count: number | null
          is_collapsed: boolean | null
          outdated_count: number | null
          parent_id: string | null
          price_at_post: number | null
          relevance_score: number | null
          stance: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_score?: number | null
          collapse_reason?: string | null
          content: string
          contradicted_count?: number | null
          created_at?: string
          discussion_id: string
          id?: string
          insightful_count?: number | null
          is_collapsed?: boolean | null
          outdated_count?: number | null
          parent_id?: string | null
          price_at_post?: number | null
          relevance_score?: number | null
          stance?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_score?: number | null
          collapse_reason?: string | null
          content?: string
          contradicted_count?: number | null
          created_at?: string
          discussion_id?: string
          id?: string
          insightful_count?: number | null
          is_collapsed?: boolean | null
          outdated_count?: number | null
          parent_id?: string | null
          price_at_post?: number | null
          relevance_score?: number | null
          stance?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: Database["public"]["Enums"]["discussion_reaction_type"]
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: Database["public"]["Enums"]["discussion_reaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: Database["public"]["Enums"]["discussion_reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "discussion_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_votes: {
        Row: {
          created_at: string
          discussion_id: string
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          id?: string
          user_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          comment_count: number | null
          created_at: string
          description: string | null
          event_type: string | null
          id: string
          is_active: boolean | null
          is_admin_created: boolean | null
          language: string | null
          market_item_id: string | null
          price_at_creation: number | null
          sentiment_score: number | null
          title: string
          type: Database["public"]["Enums"]["discussion_type"]
          updated_at: string
          upvotes: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_created?: boolean | null
          language?: string | null
          market_item_id?: string | null
          price_at_creation?: number | null
          sentiment_score?: number | null
          title: string
          type: Database["public"]["Enums"]["discussion_type"]
          updated_at?: string
          upvotes?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          description?: string | null
          event_type?: string | null
          id?: string
          is_active?: boolean | null
          is_admin_created?: boolean | null
          language?: string | null
          market_item_id?: string | null
          price_at_creation?: number | null
          sentiment_score?: number | null
          title?: string
          type?: Database["public"]["Enums"]["discussion_type"]
          updated_at?: string
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ebay_card_cache: {
        Row: {
          active_listings_count: number | null
          avg_price: number | null
          cached_image_path: string | null
          card_name: string
          card_number: string | null
          created_at: string | null
          ebay_item_ids: string[] | null
          id: string
          image_url: string | null
          last_updated: string | null
          liquidity: string | null
          max_price: number | null
          min_price: number | null
          search_query: string
          set_name: string | null
          sold_avg_price: number | null
          sold_listings_count: number | null
        }
        Insert: {
          active_listings_count?: number | null
          avg_price?: number | null
          cached_image_path?: string | null
          card_name: string
          card_number?: string | null
          created_at?: string | null
          ebay_item_ids?: string[] | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          liquidity?: string | null
          max_price?: number | null
          min_price?: number | null
          search_query: string
          set_name?: string | null
          sold_avg_price?: number | null
          sold_listings_count?: number | null
        }
        Update: {
          active_listings_count?: number | null
          avg_price?: number | null
          cached_image_path?: string | null
          card_name?: string
          card_number?: string | null
          created_at?: string | null
          ebay_item_ids?: string[] | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          liquidity?: string | null
          max_price?: number | null
          min_price?: number | null
          search_query?: string
          set_name?: string | null
          sold_avg_price?: number | null
          sold_listings_count?: number | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          email: string
          error_message: string | null
          id: string
          metadata: Json | null
          resend_id: string | null
          status: string | null
          subject: string
          template_key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          status?: string | null
          subject: string
          template_key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          status?: string | null
          subject?: string
          template_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string | null
          id: string
          marketing_emails: boolean | null
          order_updates: boolean | null
          price_alerts: boolean | null
          sold_notifications: boolean | null
          updated_at: string | null
          user_id: string
          weekly_digest: boolean | null
          welcome_emails: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          price_alerts?: boolean | null
          sold_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_digest?: boolean | null
          welcome_emails?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          price_alerts?: boolean | null
          sold_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_digest?: boolean | null
          welcome_emails?: boolean | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          is_active: boolean | null
          subject: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          subject: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          subject?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      external_liquidity_signals: {
        Row: {
          avg_price: number | null
          created_at: string
          id: string
          is_recommended: boolean | null
          last_updated: string | null
          liquidity_level: string | null
          market_item_id: string | null
          platform: string
          recommendation_reason: string | null
          spread_percent: number | null
          volume_24h: number | null
        }
        Insert: {
          avg_price?: number | null
          created_at?: string
          id?: string
          is_recommended?: boolean | null
          last_updated?: string | null
          liquidity_level?: string | null
          market_item_id?: string | null
          platform: string
          recommendation_reason?: string | null
          spread_percent?: number | null
          volume_24h?: number | null
        }
        Update: {
          avg_price?: number | null
          created_at?: string
          id?: string
          is_recommended?: boolean | null
          last_updated?: string | null
          liquidity_level?: string | null
          market_item_id?: string | null
          platform?: string
          recommendation_reason?: string | null
          spread_percent?: number | null
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_liquidity_signals_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          feature_type: string
          featured_until: string | null
          id: string
          is_active: boolean | null
          is_sponsored: boolean | null
          listing_id: string | null
          market_item_id: string | null
          position: number | null
          sponsor_fee: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_type?: string
          featured_until?: string | null
          id?: string
          is_active?: boolean | null
          is_sponsored?: boolean | null
          listing_id?: string | null
          market_item_id?: string | null
          position?: number | null
          sponsor_fee?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_type?: string
          featured_until?: string | null
          id?: string
          is_active?: boolean | null
          is_sponsored?: boolean | null
          listing_id?: string | null
          market_item_id?: string | null
          position?: number | null
          sponsor_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_items_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      fractional_listings: {
        Row: {
          allows_fractional: boolean
          available_shares: number
          created_at: string
          daily_verification_required: boolean
          id: string
          last_verified_at: string | null
          listing_id: string | null
          market_item_id: string | null
          min_shares: number
          next_verification_due: string | null
          owner_id: string
          share_price: number
          status: string
          total_shares: number
          updated_at: string
        }
        Insert: {
          allows_fractional?: boolean
          available_shares?: number
          created_at?: string
          daily_verification_required?: boolean
          id?: string
          last_verified_at?: string | null
          listing_id?: string | null
          market_item_id?: string | null
          min_shares?: number
          next_verification_due?: string | null
          owner_id: string
          share_price: number
          status?: string
          total_shares?: number
          updated_at?: string
        }
        Update: {
          allows_fractional?: boolean
          available_shares?: number
          created_at?: string
          daily_verification_required?: boolean
          id?: string
          last_verified_at?: string | null
          listing_id?: string | null
          market_item_id?: string | null
          min_shares?: number
          next_verification_due?: string | null
          owner_id?: string
          share_price?: number
          status?: string
          total_shares?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fractional_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fractional_listings_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fractional_ownership: {
        Row: {
          fractional_listing_id: string
          id: string
          purchase_price_per_share: number
          purchased_at: string
          shares_owned: number
          total_invested: number
          user_id: string
        }
        Insert: {
          fractional_listing_id: string
          id?: string
          purchase_price_per_share: number
          purchased_at?: string
          shares_owned: number
          total_invested: number
          user_id: string
        }
        Update: {
          fractional_listing_id?: string
          id?: string
          purchase_price_per_share?: number
          purchased_at?: string
          shares_owned?: number
          total_invested?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fractional_ownership_fractional_listing_id_fkey"
            columns: ["fractional_listing_id"]
            isOneToOne: false
            referencedRelation: "fractional_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      fractional_share_listings: {
        Row: {
          created_at: string
          fractional_listing_id: string
          id: string
          price_per_share: number
          seller_id: string
          shares_for_sale: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fractional_listing_id: string
          id?: string
          price_per_share: number
          seller_id: string
          shares_for_sale: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fractional_listing_id?: string
          id?: string
          price_per_share?: number
          seller_id?: string
          shares_for_sale?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fractional_share_listings_fractional_listing_id_fkey"
            columns: ["fractional_listing_id"]
            isOneToOne: false
            referencedRelation: "fractional_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      fractional_verifications: {
        Row: {
          fractional_listing_id: string
          id: string
          notes: string | null
          photo_url: string | null
          status: string
          verification_type: string
          verified_at: string
          verified_by: string
        }
        Insert: {
          fractional_listing_id: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: string
          verification_type?: string
          verified_at?: string
          verified_by: string
        }
        Update: {
          fractional_listing_id?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: string
          verification_type?: string
          verified_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fractional_verifications_fractional_listing_id_fkey"
            columns: ["fractional_listing_id"]
            isOneToOne: false
            referencedRelation: "fractional_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_credit_history: {
        Row: {
          created_at: string
          credits_change: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_change: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_change?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      grading_credits: {
        Row: {
          created_at: string
          credits_remaining: number
          first_deposit_credit_claimed: boolean | null
          first_subscribe_credit_claimed: boolean | null
          id: string
          last_monthly_credit_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_remaining?: number
          first_deposit_credit_claimed?: boolean | null
          first_subscribe_credit_claimed?: boolean | null
          id?: string
          last_monthly_credit_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          first_deposit_credit_claimed?: boolean | null
          first_subscribe_credit_claimed?: boolean | null
          id?: string
          last_monthly_credit_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grading_orders: {
        Row: {
          auto_list_enabled: boolean | null
          auto_list_price: number | null
          back_image_url: string | null
          category: string
          centering_grade: number | null
          completed_at: string | null
          confidence: number | null
          corners_grade: number | null
          created_at: string
          edges_grade: number | null
          external_request_id: string | null
          final_grade: number | null
          front_image_url: string | null
          grade_label: string | null
          grading_notes: string | null
          id: string
          idempotency_key: string
          listing_created_id: string | null
          overlay_coordinates: Json | null
          paid_at: string | null
          price_cents: number | null
          price_usd: number
          status: Database["public"]["Enums"]["grading_order_status"]
          submitted_at: string | null
          suggested_price: number | null
          surface_grade: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_list_enabled?: boolean | null
          auto_list_price?: number | null
          back_image_url?: string | null
          category: string
          centering_grade?: number | null
          completed_at?: string | null
          confidence?: number | null
          corners_grade?: number | null
          created_at?: string
          edges_grade?: number | null
          external_request_id?: string | null
          final_grade?: number | null
          front_image_url?: string | null
          grade_label?: string | null
          grading_notes?: string | null
          id?: string
          idempotency_key: string
          listing_created_id?: string | null
          overlay_coordinates?: Json | null
          paid_at?: string | null
          price_cents?: number | null
          price_usd?: number
          status?: Database["public"]["Enums"]["grading_order_status"]
          submitted_at?: string | null
          suggested_price?: number | null
          surface_grade?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_list_enabled?: boolean | null
          auto_list_price?: number | null
          back_image_url?: string | null
          category?: string
          centering_grade?: number | null
          completed_at?: string | null
          confidence?: number | null
          corners_grade?: number | null
          created_at?: string
          edges_grade?: number | null
          external_request_id?: string | null
          final_grade?: number | null
          front_image_url?: string | null
          grade_label?: string | null
          grading_notes?: string | null
          id?: string
          idempotency_key?: string
          listing_created_id?: string | null
          overlay_coordinates?: Json | null
          paid_at?: string | null
          price_cents?: number | null
          price_usd?: number
          status?: Database["public"]["Enums"]["grading_order_status"]
          submitted_at?: string | null
          suggested_price?: number | null
          surface_grade?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          request_hash: string
          response: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          request_hash: string
          response?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          response?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      item_views: {
        Row: {
          id: string
          market_item_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          market_item_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          market_item_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_views_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          created_at: string
          currency: string
          delta_cents: number
          description: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id: string
          idempotency_key: string | null
          reference_id: string | null
          reference_type: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delta_cents: number
          description?: string | null
          entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          idempotency_key?: string | null
          reference_id?: string | null
          reference_type: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          delta_cents?: number
          description?: string | null
          entry_type?: Database["public"]["Enums"]["ledger_entry_type"]
          id?: string
          idempotency_key?: string | null
          reference_id?: string | null
          reference_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_comments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          action_taken: string | null
          created_at: string | null
          description: string | null
          id: string
          listing_id: string
          report_type: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          listing_id: string
          report_type: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          listing_id?: string
          report_type?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          allows_shipping: boolean
          allows_trade: boolean
          allows_vault: boolean
          category: string
          condition: string
          created_at: string
          description: string | null
          external_id: string | null
          external_price: number | null
          external_price_cents: number | null
          id: string
          image_url: string | null
          is_auction: boolean
          price: number
          price_cents: number | null
          seller_id: string
          source: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          allows_shipping?: boolean
          allows_trade?: boolean
          allows_vault?: boolean
          category: string
          condition?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          external_price?: number | null
          external_price_cents?: number | null
          id?: string
          image_url?: string | null
          is_auction?: boolean
          price: number
          price_cents?: number | null
          seller_id: string
          source?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          allows_shipping?: boolean
          allows_trade?: boolean
          allows_vault?: boolean
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          external_id?: string | null
          external_price?: number | null
          external_price_cents?: number | null
          id?: string
          image_url?: string | null
          is_auction?: boolean
          price?: number
          price_cents?: number | null
          seller_id?: string
          source?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_controls: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          control_type: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          target_category: string | null
          target_pattern: string | null
          threshold_value: number | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          control_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          target_category?: string | null
          target_pattern?: string | null
          threshold_value?: number | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          control_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          target_category?: string | null
          target_pattern?: string | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      market_item_grades: {
        Row: {
          avg_days_to_sell: number | null
          change_24h: number | null
          change_30d: number | null
          change_7d: number | null
          created_at: string
          current_price: number
          grade: Database["public"]["Enums"]["card_condition"]
          id: string
          last_sale_price: number | null
          market_item_id: string
          sales_count_30d: number | null
        }
        Insert: {
          avg_days_to_sell?: number | null
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          created_at?: string
          current_price?: number
          grade: Database["public"]["Enums"]["card_condition"]
          id?: string
          last_sale_price?: number | null
          market_item_id: string
          sales_count_30d?: number | null
        }
        Update: {
          avg_days_to_sell?: number | null
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          created_at?: string
          current_price?: number
          grade?: Database["public"]["Enums"]["card_condition"]
          id?: string
          last_sale_price?: number | null
          market_item_id?: string
          sales_count_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_item_grades_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      market_items: {
        Row: {
          avg_days_to_sell: number | null
          base_price: number
          category: string
          change_24h: number | null
          change_30d: number | null
          change_7d: number | null
          character_name: string | null
          created_at: string
          current_price: number
          current_price_cents: number | null
          data_source: string | null
          external_id: string | null
          id: string
          image_url: string | null
          is_trending: boolean | null
          last_sale_at: string | null
          last_sale_price: number | null
          liquidity: Database["public"]["Enums"]["liquidity_level"] | null
          name: string
          price_24h_ago: number | null
          price_30d_ago: number | null
          price_7d_ago: number | null
          rarity: string | null
          sale_probability: number | null
          sales_count_30d: number | null
          series: string | null
          set_name: string | null
          subcategory: string | null
          updated_at: string
          views_24h: number | null
          views_7d: number | null
          volume_trend: string | null
          watchlist_count: number | null
        }
        Insert: {
          avg_days_to_sell?: number | null
          base_price?: number
          category: string
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          character_name?: string | null
          created_at?: string
          current_price?: number
          current_price_cents?: number | null
          data_source?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean | null
          last_sale_at?: string | null
          last_sale_price?: number | null
          liquidity?: Database["public"]["Enums"]["liquidity_level"] | null
          name: string
          price_24h_ago?: number | null
          price_30d_ago?: number | null
          price_7d_ago?: number | null
          rarity?: string | null
          sale_probability?: number | null
          sales_count_30d?: number | null
          series?: string | null
          set_name?: string | null
          subcategory?: string | null
          updated_at?: string
          views_24h?: number | null
          views_7d?: number | null
          volume_trend?: string | null
          watchlist_count?: number | null
        }
        Update: {
          avg_days_to_sell?: number | null
          base_price?: number
          category?: string
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          character_name?: string | null
          created_at?: string
          current_price?: number
          current_price_cents?: number | null
          data_source?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean | null
          last_sale_at?: string | null
          last_sale_price?: number | null
          liquidity?: Database["public"]["Enums"]["liquidity_level"] | null
          name?: string
          price_24h_ago?: number | null
          price_30d_ago?: number | null
          price_7d_ago?: number | null
          rarity?: string | null
          sale_probability?: number | null
          sales_count_30d?: number | null
          series?: string | null
          set_name?: string | null
          subcategory?: string | null
          updated_at?: string
          views_24h?: number | null
          views_7d?: number | null
          volume_trend?: string | null
          watchlist_count?: number | null
        }
        Relationships: []
      }
      market_memory: {
        Row: {
          category: string | null
          confidence: string | null
          created_at: string
          description: string
          event_date: string
          event_type: string
          id: string
          market_item_id: string | null
          price_at_event: number | null
          recovery_days: number | null
        }
        Insert: {
          category?: string | null
          confidence?: string | null
          created_at?: string
          description: string
          event_date: string
          event_type: string
          id?: string
          market_item_id?: string | null
          price_at_event?: number | null
          recovery_days?: number | null
        }
        Update: {
          category?: string | null
          confidence?: string | null
          created_at?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          market_item_id?: string | null
          price_at_event?: number | null
          recovery_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_memory_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          filtered_content: string | null
          id: string
          is_filtered: boolean | null
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          filtered_content?: string | null
          id?: string
          is_filtered?: boolean | null
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          filtered_content?: string | null
          id?: string
          is_filtered?: boolean | null
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          follower_activity: boolean | null
          id: string
          messages: boolean | null
          new_offers: boolean | null
          order_updates: boolean | null
          price_alerts: boolean | null
          push_enabled: boolean | null
          push_subscription: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          follower_activity?: boolean | null
          id?: string
          messages?: boolean | null
          new_offers?: boolean | null
          order_updates?: boolean | null
          price_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          follower_activity?: boolean | null
          id?: string
          messages?: boolean | null
          new_offers?: boolean | null
          order_updates?: boolean | null
          price_alerts?: boolean | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          parent_offer_id: string | null
          responded_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          parent_offer_id?: string | null
          responded_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          parent_offer_id?: string | null
          responded_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_disputes: {
        Row: {
          created_at: string | null
          description: string
          dispute_type: string
          evidence_urls: string[] | null
          id: string
          opened_by: string
          order_id: string
          refund_amount: number | null
          resolved_at: string | null
          resolved_by: string | null
          ruling: string | null
          seller_evidence_urls: string[] | null
          seller_response: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          dispute_type: string
          evidence_urls?: string[] | null
          id?: string
          opened_by: string
          order_id: string
          refund_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          ruling?: string | null
          seller_evidence_urls?: string[] | null
          seller_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          dispute_type?: string
          evidence_urls?: string[] | null
          id?: string
          opened_by?: string
          order_id?: string
          refund_amount?: number | null
          resolved_at?: string | null
          resolved_by?: string | null
          ruling?: string | null
          seller_evidence_urls?: string[] | null
          seller_response?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_fee: number
          buyer_fee_cents: number | null
          buyer_id: string
          created_at: string
          delivery_option: Database["public"]["Enums"]["delivery_option"]
          id: string
          listing_id: string
          price: number
          price_cents: number | null
          seller_fee: number
          seller_fee_cents: number | null
          seller_id: string
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_fee: number
          buyer_fee_cents?: number | null
          buyer_id: string
          created_at?: string
          delivery_option: Database["public"]["Enums"]["delivery_option"]
          id?: string
          listing_id: string
          price: number
          price_cents?: number | null
          seller_fee: number
          seller_fee_cents?: number | null
          seller_id: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_fee?: number
          buyer_fee_cents?: number | null
          buyer_id?: string
          created_at?: string
          delivery_option?: Database["public"]["Enums"]["delivery_option"]
          id?: string
          listing_id?: string
          price?: number
          price_cents?: number | null
          seller_fee?: number
          seller_fee_cents?: number | null
          seller_id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          intent_type: string
          metadata: Json | null
          provider: string
          provider_intent_id: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["payment_intent_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          intent_type: string
          metadata?: Json | null
          provider: string
          provider_intent_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          intent_type?: string
          metadata?: Json | null
          provider?: string
          provider_intent_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          amount: number
          completed_at: string | null
          conversation_id: string
          created_at: string
          fee: number
          id: string
          payment_id: string | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          conversation_id: string
          created_at?: string
          fee: number
          id?: string
          payment_id?: string | null
          status?: string
          total: number
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          conversation_id?: string
          created_at?: string
          fee?: number
          id?: string
          payment_id?: string | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      portfolio_heat_scores: {
        Row: {
          calculated_at: string
          created_at: string
          id: string
          liquidity_score: number | null
          price_movement_score: number | null
          score: number
          user_id: string
          views_score: number | null
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          id?: string
          liquidity_score?: number | null
          price_movement_score?: number | null
          score?: number
          user_id: string
          views_score?: number | null
        }
        Update: {
          calculated_at?: string
          created_at?: string
          id?: string
          liquidity_score?: number | null
          price_movement_score?: number | null
          score?: number
          user_id?: string
          views_score?: number | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          custom_name: string | null
          grade: Database["public"]["Enums"]["card_condition"] | null
          id: string
          image_url: string | null
          in_vault: boolean | null
          market_item_id: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          updated_at: string
          user_id: string
          vault_item_id: string | null
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          grade?: Database["public"]["Enums"]["card_condition"] | null
          id?: string
          image_url?: string | null
          in_vault?: boolean | null
          market_item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          updated_at?: string
          user_id: string
          vault_item_id?: string | null
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          grade?: Database["public"]["Enums"]["card_condition"] | null
          id?: string
          image_url?: string | null
          in_vault?: boolean | null
          market_item_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          updated_at?: string
          user_id?: string
          vault_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          id: string
          item_count: number
          recorded_at: string
          total_cost: number
          total_value: number
          user_id: string
        }
        Insert: {
          id?: string
          item_count?: number
          recorded_at?: string
          total_cost?: number
          total_value: number
          user_id: string
        }
        Update: {
          id?: string
          item_count?: number
          recorded_at?: string
          total_cost?: number
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          is_triggered: boolean
          market_item_id: string
          target_price: number
          triggered_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          market_item_id: string
          target_price: number
          triggered_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_triggered?: boolean
          market_item_id?: string
          target_price?: number
          triggered_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          id: string
          market_item_id: string | null
          price: number
          product_id: string
          recorded_at: string
          sample_count: number | null
          source: string
          volume: number | null
        }
        Insert: {
          id?: string
          market_item_id?: string | null
          price: number
          product_id: string
          recorded_at?: string
          sample_count?: number | null
          source?: string
          volume?: number | null
        }
        Update: {
          id?: string
          market_item_id?: string | null
          price?: number
          product_id?: string
          recorded_at?: string
          sample_count?: number | null
          source?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      price_votes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_votes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_backgrounds: {
        Row: {
          created_at: string
          css_value: string
          id: string
          is_premium: boolean | null
          name: string
          type: string
          unlock_level: number | null
          xp_cost: number | null
        }
        Insert: {
          created_at?: string
          css_value: string
          id?: string
          is_premium?: boolean | null
          name: string
          type?: string
          unlock_level?: number | null
          xp_cost?: number | null
        }
        Update: {
          created_at?: string
          css_value?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          type?: string
          unlock_level?: number | null
          xp_cost?: number | null
        }
        Relationships: []
      }
      profile_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          reviewed_user_id: string
          reviewer_id: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          reviewed_user_id?: string
          reviewer_id?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          account_type: Database["public"]["Enums"]["account_type"]
          activation_unlocked: boolean | null
          avatar_url: string | null
          badges: Json | null
          banned_at: string | null
          banned_reason: string | null
          bio: string | null
          created_at: string
          custom_guru: string | null
          display_name: string | null
          email: string | null
          first_deposit_at: string | null
          first_deposit_completed: boolean | null
          guru_expertise: string[] | null
          id: string
          id_document_url: string | null
          is_beta_tester: boolean | null
          is_fan_account: boolean | null
          is_id_verified: boolean | null
          level: number | null
          national_id: string | null
          paused_at: string | null
          paused_until: string | null
          phone: string | null
          phone_verified: boolean | null
          premium_trial_expires_at: string | null
          profile_background: string | null
          referral_code: string | null
          referred_by: string | null
          reputation_score: number | null
          reputation_tier: string | null
          showcase_items: string[] | null
          title: string | null
          trust_rating: number | null
          trust_review_count: number | null
          updated_at: string
          wire_transfer_code: string | null
          xp: number | null
        }
        Insert: {
          account_status?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          activation_unlocked?: boolean | null
          avatar_url?: string | null
          badges?: Json | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          created_at?: string
          custom_guru?: string | null
          display_name?: string | null
          email?: string | null
          first_deposit_at?: string | null
          first_deposit_completed?: boolean | null
          guru_expertise?: string[] | null
          id: string
          id_document_url?: string | null
          is_beta_tester?: boolean | null
          is_fan_account?: boolean | null
          is_id_verified?: boolean | null
          level?: number | null
          national_id?: string | null
          paused_at?: string | null
          paused_until?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          premium_trial_expires_at?: string | null
          profile_background?: string | null
          referral_code?: string | null
          referred_by?: string | null
          reputation_score?: number | null
          reputation_tier?: string | null
          showcase_items?: string[] | null
          title?: string | null
          trust_rating?: number | null
          trust_review_count?: number | null
          updated_at?: string
          wire_transfer_code?: string | null
          xp?: number | null
        }
        Update: {
          account_status?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          activation_unlocked?: boolean | null
          avatar_url?: string | null
          badges?: Json | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          created_at?: string
          custom_guru?: string | null
          display_name?: string | null
          email?: string | null
          first_deposit_at?: string | null
          first_deposit_completed?: boolean | null
          guru_expertise?: string[] | null
          id?: string
          id_document_url?: string | null
          is_beta_tester?: boolean | null
          is_fan_account?: boolean | null
          is_id_verified?: boolean | null
          level?: number | null
          national_id?: string | null
          paused_at?: string | null
          paused_until?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          premium_trial_expires_at?: string | null
          profile_background?: string | null
          referral_code?: string | null
          referred_by?: string | null
          reputation_score?: number | null
          reputation_tier?: string | null
          showcase_items?: string[] | null
          title?: string | null
          trust_rating?: number | null
          trust_review_count?: number | null
          updated_at?: string
          wire_transfer_code?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      promo_code_uses: {
        Row: {
          created_at: string | null
          discount_applied: number
          id: string
          order_id: string | null
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_applied: number
          id?: string
          order_id?: string | null
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_applied?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          category_restriction: string | null
          code: string
          created_at: string | null
          created_by: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          per_user_limit: number | null
          starts_at: string | null
          updated_at: string | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          category_restriction?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          category_restriction?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          payment_intent_id: string | null
          process_error: string | null
          processed: boolean | null
          processed_at: string | null
          provider: string
          signature: string | null
          signature_verified: boolean | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          payload: Json
          payment_intent_id?: string | null
          process_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          provider: string
          signature?: string | null
          signature_verified?: boolean | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_intent_id?: string | null
          process_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          provider?: string
          signature?: string | null
          signature_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          card_image_url: string | null
          card_name: string
          created_at: string
          deal_price: number
          grade: string | null
          id: string
          listing_id: string | null
          market_delta: number | null
          market_item_id: string | null
          market_price: number
          order_id: string | null
          receipt_type: string
          share_code: string
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          card_image_url?: string | null
          card_name: string
          created_at?: string
          deal_price: number
          grade?: string | null
          id?: string
          listing_id?: string | null
          market_delta?: number | null
          market_item_id?: string | null
          market_price: number
          order_id?: string | null
          receipt_type?: string
          share_code?: string
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          card_image_url?: string | null
          card_name?: string
          created_at?: string
          deal_price?: number
          grade?: string | null
          id?: string
          listing_id?: string | null
          market_delta?: number | null
          market_item_id?: string | null
          market_price?: number
          order_id?: string | null
          receipt_type?: string
          share_code?: string
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_mismatches: {
        Row: {
          actual_amount_cents: number | null
          created_at: string
          details: Json | null
          expected_amount_cents: number | null
          id: string
          mismatch_type: string
          payment_intent_id: string | null
          provider_event_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          actual_amount_cents?: number | null
          created_at?: string
          details?: Json | null
          expected_amount_cents?: number | null
          id?: string
          mismatch_type: string
          payment_intent_id?: string | null
          provider_event_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          actual_amount_cents?: number | null
          created_at?: string
          details?: Json | null
          expected_amount_cents?: number | null
          id?: string
          mismatch_type?: string
          payment_intent_id?: string | null
          provider_event_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_mismatches_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_mismatches_provider_event_id_fkey"
            columns: ["provider_event_id"]
            isOneToOne: false
            referencedRelation: "provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          parent_id: string | null
          reel_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          reel_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          reel_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "card_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "card_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_saves: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_saves_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "card_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_watch_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          reel_id: string
          session_id: string | null
          user_id: string | null
          watch_duration: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          reel_id: string
          session_id?: string | null
          user_id?: string | null
          watch_duration?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          reel_id?: string
          session_id?: string | null
          user_id?: string | null
          watch_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_watch_events_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "card_reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_listings: {
        Row: {
          confidence_level: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_updated: string | null
          market_item_id: string | null
          price_source: string
          reference_price: number
          sample_size: number | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          market_item_id?: string | null
          price_source?: string
          reference_price: number
          sample_size?: number | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_updated?: string | null
          market_item_id?: string | null
          price_source?: string
          reference_price?: number
          sample_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_listings_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          event_type: string
          id: string
          referral_id: string | null
          referred_id: string
          referrer_id: string
          source_amount: number
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          event_type: string
          id?: string
          referral_id?: string | null
          referred_id: string
          referrer_id: string
          source_amount?: number
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          event_type?: string
          id?: string
          referral_id?: string | null
          referred_id?: string
          referrer_id?: string
          source_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_earned: number | null
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_deposit_total: number | null
          referred_id: string
          referred_trade_volume: number | null
          referrer_id: string
          reward_amount: number | null
          status: string
          tier: string | null
        }
        Insert: {
          commission_earned?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_deposit_total?: number | null
          referred_id: string
          referred_trade_volume?: number | null
          referrer_id: string
          reward_amount?: number | null
          status?: string
          tier?: string | null
        }
        Update: {
          commission_earned?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_deposit_total?: number | null
          referred_id?: string
          referred_trade_volume?: number | null
          referrer_id?: string
          reward_amount?: number | null
          status?: string
          tier?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          ledger_entry_id: string | null
          payment_intent_id: string
          provider_refund_id: string | null
          reason: string | null
          status: Database["public"]["Enums"]["payment_intent_status"]
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          ledger_entry_id?: string | null
          payment_intent_id: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          ledger_entry_id?: string | null
          payment_intent_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
        }
        Relationships: [
          {
            foreignKeyName: "refunds_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      regret_simulations: {
        Row: {
          card_name: string
          created_at: string
          current_price: number
          current_value: number
          historical_price: number
          id: string
          investment_amount: number
          investment_date: string
          market_item_id: string | null
          profit_loss: number
          profit_loss_percent: number
          share_code: string
          views_count: number | null
        }
        Insert: {
          card_name: string
          created_at?: string
          current_price: number
          current_value: number
          historical_price: number
          id?: string
          investment_amount: number
          investment_date: string
          market_item_id?: string | null
          profit_loss: number
          profit_loss_percent: number
          share_code?: string
          views_count?: number | null
        }
        Update: {
          card_name?: string
          created_at?: string
          current_price?: number
          current_value?: number
          historical_price?: number
          id?: string
          investment_amount?: number
          investment_date?: string
          market_item_id?: string | null
          profit_loss?: number
          profit_loss_percent?: number
          share_code?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "regret_simulations_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          points_change: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          points_change: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          points_change?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          photos: string[] | null
          rating: number
          review_type: string
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          photos?: string[] | null
          rating: number
          review_type: string
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          photos?: string[] | null
          rating?: number
          review_type?: string
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          stock: number | null
          type: Database["public"]["Enums"]["reward_type"]
          value_amount: number | null
          xp_cost: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          stock?: number | null
          type: Database["public"]["Enums"]["reward_type"]
          value_amount?: number | null
          xp_cost: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          stock?: number | null
          type?: Database["public"]["Enums"]["reward_type"]
          value_amount?: number | null
          xp_cost?: number
        }
        Relationships: []
      }
      seller_verifications: {
        Row: {
          address_proof_url: string | null
          admin_notes: string | null
          business_document_url: string | null
          business_name: string | null
          business_type: string | null
          created_at: string | null
          id: string
          id_document_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_proof_url?: string | null
          admin_notes?: string | null
          business_document_url?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_proof_url?: string | null
          admin_notes?: string | null
          business_document_url?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          id?: string
          id_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      set_completion: {
        Row: {
          completion_percent: number | null
          created_at: string
          id: string
          owned_cards: Json
          set_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_percent?: number | null
          created_at?: string
          id?: string
          owned_cards?: Json
          set_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_percent?: number | null
          created_at?: string
          id?: string
          owned_cards?: Json
          set_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_completion_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "card_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_wishlists: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string | null
          market_item_id: string | null
          search_count: number | null
          user_id: string
          view_count: number | null
          view_duration_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          market_item_id?: string | null
          search_count?: number | null
          user_id: string
          view_count?: number | null
          view_duration_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          market_item_id?: string | null
          search_count?: number | null
          user_id?: string
          view_count?: number | null
          view_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shadow_wishlists_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          message: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_entries: {
        Row: {
          cards_sold: number
          created_at: string
          id: string
          prize_won: number | null
          rank: number | null
          tournament_month: string
          updated_at: string
          user_id: string
          volume_amount: number
        }
        Insert: {
          cards_sold?: number
          created_at?: string
          id?: string
          prize_won?: number | null
          rank?: number | null
          tournament_month: string
          updated_at?: string
          user_id: string
          volume_amount?: number
        }
        Update: {
          cards_sold?: number
          created_at?: string
          id?: string
          prize_won?: number | null
          rank?: number | null
          tournament_month?: string
          updated_at?: string
          user_id?: string
          volume_amount?: number
        }
        Relationships: []
      }
      trade_items: {
        Row: {
          created_at: string
          description: string
          estimated_value: number | null
          id: string
          owner_id: string
          photo_url: string | null
          photo_verified: boolean | null
          portfolio_item_id: string | null
          trade_id: string
          vault_item_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          estimated_value?: number | null
          id?: string
          owner_id: string
          photo_url?: string | null
          photo_verified?: boolean | null
          portfolio_item_id?: string | null
          trade_id: string
          vault_item_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          estimated_value?: number | null
          id?: string
          owner_id?: string
          photo_url?: string | null
          photo_verified?: boolean | null
          portfolio_item_id?: string | null
          trade_id?: string
          vault_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_items_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_items_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_preferences: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          market_item_id: string | null
          max_price: number | null
          min_grade: string | null
          notes: string | null
          preference_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          market_item_id?: string | null
          max_price?: number | null
          min_grade?: string | null
          notes?: string | null
          preference_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          market_item_id?: string | null
          max_price?: number | null
          min_grade?: string | null
          notes?: string | null
          preference_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_preferences_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          cash_adjustment: number | null
          cash_from_initiator: boolean | null
          created_at: string
          id: string
          initiator_confirmed: boolean | null
          initiator_id: string
          notes: string | null
          recipient_confirmed: boolean | null
          recipient_id: string
          status: Database["public"]["Enums"]["trade_status"]
          updated_at: string
        }
        Insert: {
          cash_adjustment?: number | null
          cash_from_initiator?: boolean | null
          created_at?: string
          id?: string
          initiator_confirmed?: boolean | null
          initiator_id: string
          notes?: string | null
          recipient_confirmed?: boolean | null
          recipient_id: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Update: {
          cash_adjustment?: number | null
          cash_from_initiator?: boolean | null
          created_at?: string
          id?: string
          initiator_confirmed?: boolean | null
          initiator_id?: string
          notes?: string | null
          recipient_confirmed?: boolean | null
          recipient_id?: string
          status?: Database["public"]["Enums"]["trade_status"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee: number | null
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee?: number | null
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ibans: {
        Row: {
          bank_name: string | null
          created_at: string
          holder_name: string
          iban: string
          id: string
          is_primary: boolean | null
          is_verified: boolean | null
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          created_at?: string
          holder_name: string
          iban: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          user_id: string
        }
        Update: {
          bank_name?: string | null
          created_at?: string
          holder_name?: string
          iban?: string
          id?: string
          is_primary?: boolean | null
          is_verified?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_market_signals: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          market_item_id: string | null
          price_at_signal: number | null
          signal_type: string
          signal_value: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          market_item_id?: string | null
          price_at_signal?: number | null
          signal_type: string
          signal_value: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          market_item_id?: string | null
          price_at_signal?: number | null
          signal_type?: string
          signal_value?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_market_signals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_market_signals_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rewards: {
        Row: {
          claimed_at: string
          code: string | null
          expires_at: string | null
          id: string
          reward_id: string
          status: Database["public"]["Enums"]["reward_status"]
          used_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          code?: string | null
          expires_at?: string | null
          id?: string
          reward_id: string
          status?: Database["public"]["Enums"]["reward_status"]
          used_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          code?: string | null
          expires_at?: string | null
          id?: string
          reward_id?: string
          status?: Database["public"]["Enums"]["reward_status"]
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          expires_at: string | null
          id: string
          price_monthly: number
          started_at: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          price_monthly?: number
          started_at?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          price_monthly?: number
          started_at?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_unlocked_backgrounds: {
        Row: {
          background_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          background_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          background_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocked_backgrounds_background_id_fkey"
            columns: ["background_id"]
            isOneToOne: false
            referencedRelation: "profile_backgrounds"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_items: {
        Row: {
          admin_notes: string | null
          category: string
          condition: string
          created_at: string
          description: string | null
          estimated_value: number | null
          id: string
          image_url: string | null
          listing_id: string | null
          order_id: string | null
          owner_id: string
          received_at: string | null
          shipped_at: string | null
          status: string | null
          title: string
          tracking_number: string | null
          verified_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: string
          condition: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          order_id?: string | null
          owner_id: string
          received_at?: string | null
          shipped_at?: string | null
          status?: string | null
          title: string
          tracking_number?: string | null
          verified_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          listing_id?: string | null
          order_id?: string | null
          owner_id?: string
          received_at?: string | null
          shipped_at?: string | null
          status?: string | null
          title?: string
          tracking_number?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_sellers: {
        Row: {
          business_address: string | null
          business_name: string | null
          created_at: string
          id: string
          id_document_url: string | null
          subscription_active: boolean
          subscription_ends_at: string | null
          subscription_started_at: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          subscription_active?: boolean
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          id_document_url?: string | null
          subscription_active?: boolean
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          interest: Database["public"]["Enums"]["waitlist_interest"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interest?: Database["public"]["Enums"]["waitlist_interest"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interest?: Database["public"]["Enums"]["waitlist_interest"]
        }
        Relationships: []
      }
      wallet_audit_log: {
        Row: {
          action: string
          change_amount: number
          created_at: string
          id: string
          ip_address: string | null
          new_balance: number | null
          old_balance: number | null
          reference_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          action: string
          change_amount: number
          created_at?: string
          id?: string
          ip_address?: string | null
          new_balance?: number | null
          old_balance?: number | null
          reference_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          action?: string
          change_amount?: number
          created_at?: string
          id?: string
          ip_address?: string | null
          new_balance?: number | null
          old_balance?: number | null
          reference_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_audit_log_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          balance_cents: number | null
          created_at: string
          currency: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          balance_cents?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          balance_cents?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          grade: Database["public"]["Enums"]["card_condition"] | null
          id: string
          market_item_id: string
          notify_on_new_listing: boolean | null
          notify_on_price_drop: boolean | null
          target_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: Database["public"]["Enums"]["card_condition"] | null
          id?: string
          market_item_id: string
          notify_on_new_listing?: boolean | null
          notify_on_price_drop?: boolean | null
          target_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: Database["public"]["Enums"]["card_condition"] | null
          id?: string
          market_item_id?: string
          notify_on_new_listing?: boolean | null
          notify_on_price_drop?: boolean | null
          target_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_market_item_id_fkey"
            columns: ["market_item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      whale_invites: {
        Row: {
          created_at: string
          early_exit_warnings: boolean | null
          faster_payouts: boolean | null
          fee_discount_percent: number | null
          id: string
          invite_tier: string
          invited_by: string | null
          is_active: boolean | null
          notes: string | null
          payout_speed_hours: number | null
          private_liquidity_access: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          early_exit_warnings?: boolean | null
          faster_payouts?: boolean | null
          fee_discount_percent?: number | null
          id?: string
          invite_tier: string
          invited_by?: string | null
          is_active?: boolean | null
          notes?: string | null
          payout_speed_hours?: number | null
          private_liquidity_access?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          early_exit_warnings?: boolean | null
          faster_payouts?: boolean | null
          fee_discount_percent?: number | null
          id?: string
          invite_tier?: string
          invited_by?: string | null
          is_active?: boolean | null
          notes?: string | null
          payout_speed_hours?: number | null
          private_liquidity_access?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      wire_transfers: {
        Row: {
          amount: number
          commission_rate: number | null
          created_at: string
          currency: string | null
          id: string
          matched_code: string | null
          net_amount: number | null
          notes: string | null
          processed_at: string | null
          sender_iban: string | null
          sender_name: string | null
          status: Database["public"]["Enums"]["wire_transfer_status"]
          transfer_description: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          matched_code?: string | null
          net_amount?: number | null
          notes?: string | null
          processed_at?: string | null
          sender_iban?: string | null
          sender_name?: string | null
          status?: Database["public"]["Enums"]["wire_transfer_status"]
          transfer_description?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          matched_code?: string | null
          net_amount?: number | null
          notes?: string | null
          processed_at?: string | null
          sender_iban?: string | null
          sender_name?: string | null
          status?: Database["public"]["Enums"]["wire_transfer_status"]
          transfer_description?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          batch_id: string | null
          created_at: string
          iban_id: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          batch_id?: string | null
          created_at?: string
          iban_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          batch_id?: string | null
          created_at?: string
          iban_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_iban_id_fkey"
            columns: ["iban_id"]
            isOneToOne: false
            referencedRelation: "user_ibans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_history: {
        Row: {
          action: Database["public"]["Enums"]["xp_action_type"]
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          action: Database["public"]["Enums"]["xp_action_type"]
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          user_id: string
          xp_earned: number
        }
        Update: {
          action?: Database["public"]["Enums"]["xp_action_type"]
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          avatar_url: string | null
          badges: Json | null
          bio: string | null
          created_at: string | null
          custom_guru: string | null
          display_name: string | null
          guru_expertise: string[] | null
          id: string | null
          is_beta_tester: boolean | null
          is_fan_account: boolean | null
          is_id_verified: boolean | null
          level: number | null
          profile_background: string | null
          reputation_score: number | null
          reputation_tier: string | null
          showcase_items: string[] | null
          title: string | null
          trust_rating: number | null
          trust_review_count: number | null
          xp: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badges?: Json | null
          bio?: string | null
          created_at?: string | null
          custom_guru?: string | null
          display_name?: string | null
          guru_expertise?: string[] | null
          id?: string | null
          is_beta_tester?: boolean | null
          is_fan_account?: boolean | null
          is_id_verified?: boolean | null
          level?: number | null
          profile_background?: string | null
          reputation_score?: number | null
          reputation_tier?: string | null
          showcase_items?: string[] | null
          title?: string | null
          trust_rating?: number | null
          trust_review_count?: number | null
          xp?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null
          avatar_url?: string | null
          badges?: Json | null
          bio?: string | null
          created_at?: string | null
          custom_guru?: string | null
          display_name?: string | null
          guru_expertise?: string[] | null
          id?: string | null
          is_beta_tester?: boolean | null
          is_fan_account?: boolean | null
          is_id_verified?: boolean | null
          level?: number | null
          profile_background?: string | null
          reputation_score?: number | null
          reputation_tier?: string | null
          showcase_items?: string[] | null
          title?: string | null
          trust_rating?: number | null
          trust_review_count?: number | null
          xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_cardboom_points: {
        Args: {
          p_description?: string
          p_reference_id?: string
          p_source: string
          p_transaction_amount: number
          p_user_id: string
        }
        Returns: number
      }
      calculate_card_war_payouts: {
        Args: { war_id: string }
        Returns: undefined
      }
      calculate_level: { Args: { xp_amount: number }; Returns: number }
      calculate_portfolio_heat: { Args: { p_user_id: string }; Returns: number }
      calculate_reel_trending_score: {
        Args: { reel_uuid: string }
        Returns: number
      }
      check_idempotency: {
        Args: { p_key: string; p_request_hash: string; p_user_id: string }
        Returns: Json
      }
      finalize_community_poll: {
        Args: { poll_uuid: string }
        Returns: undefined
      }
      get_seller_rating: {
        Args: { seller_uuid: string }
        Returns: {
          avg_rating: number
          review_count: number
        }[]
      }
      get_user_balance: {
        Args: { p_currency?: string; p_user_id: string }
        Returns: number
      }
      get_wallet_balance: {
        Args: { p_currency?: string; p_wallet_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_reel_shares: { Args: { reel_uuid: string }; Returns: undefined }
      increment_reel_views: { Args: { reel_uuid: string }; Returns: undefined }
      post_ledger_entry: {
        Args: {
          p_currency: string
          p_delta_cents: number
          p_description: string
          p_entry_type: Database["public"]["Enums"]["ledger_entry_type"]
          p_idempotency_key: string
          p_reference_id: string
          p_reference_type: string
          p_wallet_id: string
        }
        Returns: string
      }
      record_idempotency: {
        Args: {
          p_key: string
          p_request_hash: string
          p_response: Json
          p_user_id: string
        }
        Returns: undefined
      }
      spend_cardboom_points: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_source: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_call_outcomes: { Args: never; Returns: undefined }
      update_reputation: {
        Args: {
          p_event_type: string
          p_points: number
          p_reference_id?: string
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      account_type: "buyer" | "seller" | "both"
      app_role: "admin" | "moderator" | "user"
      card_condition:
        | "raw"
        | "psa1"
        | "psa2"
        | "psa3"
        | "psa4"
        | "psa5"
        | "psa6"
        | "psa7"
        | "psa8"
        | "psa9"
        | "psa10"
        | "bgs9"
        | "bgs9_5"
        | "bgs10"
        | "cgc9"
        | "cgc9_5"
        | "cgc10"
      delivery_option: "vault" | "trade" | "ship"
      discussion_reaction_type: "insightful" | "outdated" | "contradicted"
      discussion_type: "card" | "event" | "strategy"
      grading_order_status:
        | "pending_payment"
        | "queued"
        | "in_review"
        | "completed"
        | "failed"
        | "refunded"
      ledger_entry_type:
        | "deposit"
        | "withdrawal"
        | "purchase"
        | "sale"
        | "refund"
        | "grading_fee"
        | "subscription_fee"
        | "reward"
        | "adjustment"
      liquidity_level: "high" | "medium" | "low"
      listing_status: "active" | "sold" | "cancelled" | "reserved"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "countered"
        | "expired"
        | "cancelled"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
      payment_intent_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
      reward_status: "available" | "claimed" | "expired" | "used"
      reward_type:
        | "voucher"
        | "free_shipping"
        | "early_access"
        | "exclusive_drop"
      trade_status:
        | "proposed"
        | "pending_photos"
        | "photos_submitted"
        | "pending_confirmation"
        | "confirmed"
        | "in_transit"
        | "completed"
        | "cancelled"
        | "disputed"
      transaction_type:
        | "topup"
        | "purchase"
        | "sale"
        | "fee"
        | "subscription"
        | "withdrawal"
      verification_status: "pending" | "approved" | "rejected"
      waitlist_interest: "buyer" | "seller" | "both"
      wire_transfer_status: "pending" | "matched" | "confirmed" | "rejected"
      xp_action_type:
        | "purchase"
        | "sale"
        | "listing"
        | "referral"
        | "daily_login"
        | "review"
        | "first_purchase"
        | "streak_bonus"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["buyer", "seller", "both"],
      app_role: ["admin", "moderator", "user"],
      card_condition: [
        "raw",
        "psa1",
        "psa2",
        "psa3",
        "psa4",
        "psa5",
        "psa6",
        "psa7",
        "psa8",
        "psa9",
        "psa10",
        "bgs9",
        "bgs9_5",
        "bgs10",
        "cgc9",
        "cgc9_5",
        "cgc10",
      ],
      delivery_option: ["vault", "trade", "ship"],
      discussion_reaction_type: ["insightful", "outdated", "contradicted"],
      discussion_type: ["card", "event", "strategy"],
      grading_order_status: [
        "pending_payment",
        "queued",
        "in_review",
        "completed",
        "failed",
        "refunded",
      ],
      ledger_entry_type: [
        "deposit",
        "withdrawal",
        "purchase",
        "sale",
        "refund",
        "grading_fee",
        "subscription_fee",
        "reward",
        "adjustment",
      ],
      liquidity_level: ["high", "medium", "low"],
      listing_status: ["active", "sold", "cancelled", "reserved"],
      offer_status: [
        "pending",
        "accepted",
        "rejected",
        "countered",
        "expired",
        "cancelled",
      ],
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
      ],
      payment_intent_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      reward_status: ["available", "claimed", "expired", "used"],
      reward_type: [
        "voucher",
        "free_shipping",
        "early_access",
        "exclusive_drop",
      ],
      trade_status: [
        "proposed",
        "pending_photos",
        "photos_submitted",
        "pending_confirmation",
        "confirmed",
        "in_transit",
        "completed",
        "cancelled",
        "disputed",
      ],
      transaction_type: [
        "topup",
        "purchase",
        "sale",
        "fee",
        "subscription",
        "withdrawal",
      ],
      verification_status: ["pending", "approved", "rejected"],
      waitlist_interest: ["buyer", "seller", "both"],
      wire_transfer_status: ["pending", "matched", "confirmed", "rejected"],
      xp_action_type: [
        "purchase",
        "sale",
        "listing",
        "referral",
        "daily_login",
        "review",
        "first_purchase",
        "streak_bonus",
      ],
    },
  },
} as const
