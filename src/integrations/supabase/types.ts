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
          id: string
          image_url: string | null
          price: number
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
          id?: string
          image_url?: string | null
          price: number
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
          id?: string
          image_url?: string | null
          price?: number
          seller_id?: string
          source?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
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
          base_price: number
          category: string
          change_24h: number | null
          change_30d: number | null
          change_7d: number | null
          character_name: string | null
          created_at: string
          current_price: number
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
          sales_count_30d: number | null
          series: string | null
          set_name: string | null
          subcategory: string | null
          updated_at: string
          views_24h: number | null
          views_7d: number | null
          watchlist_count: number | null
        }
        Insert: {
          base_price?: number
          category: string
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          character_name?: string | null
          created_at?: string
          current_price?: number
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
          sales_count_30d?: number | null
          series?: string | null
          set_name?: string | null
          subcategory?: string | null
          updated_at?: string
          views_24h?: number | null
          views_7d?: number | null
          watchlist_count?: number | null
        }
        Update: {
          base_price?: number
          category?: string
          change_24h?: number | null
          change_30d?: number | null
          change_7d?: number | null
          character_name?: string | null
          created_at?: string
          current_price?: number
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
          sales_count_30d?: number | null
          series?: string | null
          set_name?: string | null
          subcategory?: string | null
          updated_at?: string
          views_24h?: number | null
          views_7d?: number | null
          watchlist_count?: number | null
        }
        Relationships: []
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
      orders: {
        Row: {
          buyer_fee: number
          buyer_id: string
          created_at: string
          delivery_option: Database["public"]["Enums"]["delivery_option"]
          id: string
          listing_id: string
          price: number
          seller_fee: number
          seller_id: string
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_fee: number
          buyer_id: string
          created_at?: string
          delivery_option: Database["public"]["Enums"]["delivery_option"]
          id?: string
          listing_id: string
          price: number
          seller_fee: number
          seller_id: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_fee?: number
          buyer_id?: string
          created_at?: string
          delivery_option?: Database["public"]["Enums"]["delivery_option"]
          id?: string
          listing_id?: string
          price?: number
          seller_fee?: number
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
      price_history: {
        Row: {
          id: string
          price: number
          product_id: string
          recorded_at: string
          source: string
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          recorded_at?: string
          source?: string
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          recorded_at?: string
          source?: string
        }
        Relationships: []
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
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          level: number | null
          national_id: string | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
          wire_transfer_code: string | null
          xp: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          level?: number | null
          national_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          wire_transfer_code?: string | null
          xp?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          level?: number | null
          national_id?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          wire_transfer_code?: string | null
          xp?: number | null
        }
        Relationships: []
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
      vault_items: {
        Row: {
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
          title: string
        }
        Insert: {
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
          title: string
        }
        Update: {
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
          title?: string
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
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      calculate_level: { Args: { xp_amount: number }; Returns: number }
    }
    Enums: {
      account_type: "buyer" | "seller" | "both"
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
