export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string
          description: string
          id: string
          locale: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          social_image_bucket: string | null
          social_image_path: string | null
        }
        Insert: {
          category_id: string
          description?: string
          id?: string
          locale: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          social_image_bucket?: string | null
          social_image_path?: string | null
        }
        Update: {
          category_id?: string
          description?: string
          id?: string
          locale?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          social_image_bucket?: string | null
          social_image_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string
          finalized_at: string | null
          id: string
          inventory_record_id: string
          order_id: string
          order_line_id: string
          payment_transition_id: string | null
          quantity_reserved: number
          release_reason: string | null
          released_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          finalized_at?: string | null
          id?: string
          inventory_record_id: string
          order_id: string
          order_line_id: string
          payment_transition_id?: string | null
          quantity_reserved: number
          release_reason?: string | null
          released_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          finalized_at?: string | null
          id?: string
          inventory_record_id?: string
          order_id?: string
          order_line_id?: string
          payment_transition_id?: string | null
          quantity_reserved?: number
          release_reason?: string | null
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_inventory_reservations_inventory_record_id_fkey"
            columns: ["inventory_record_id"]
            isOneToOne: false
            referencedRelation: "inventory_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "checkout_inventory_reservations_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "checkout_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_inventory_reservations_payment_transition_id_fkey"
            columns: ["payment_transition_id"]
            isOneToOne: false
            referencedRelation: "payment_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_order_lines: {
        Row: {
          created_at: string
          currency_code: string
          discount_allocation_minor: number
          fulfillment_type: string
          id: string
          line_id: string
          line_subtotal_minor: number
          market: string
          order_id: string
          product_id: string
          product_title: string
          quantity: number
          quote_line_snapshot: Json
          shipping_allocation_minor: number
          sku: string | null
          unit_price_minor: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          currency_code: string
          discount_allocation_minor?: number
          fulfillment_type: string
          id?: string
          line_id: string
          line_subtotal_minor: number
          market: string
          order_id: string
          product_id: string
          product_title: string
          quantity: number
          quote_line_snapshot: Json
          shipping_allocation_minor?: number
          sku?: string | null
          unit_price_minor: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          discount_allocation_minor?: number
          fulfillment_type?: string
          id?: string
          line_id?: string
          line_subtotal_minor?: number
          market?: string
          order_id?: string
          product_id?: string
          product_title?: string
          quantity?: number
          quote_line_snapshot?: Json
          shipping_allocation_minor?: number
          sku?: string | null
          unit_price_minor?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "checkout_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_orders: {
        Row: {
          accepted_quote_hash: string
          cart_snapshot: Json
          contact_email: string
          created_at: string
          currency_code: string
          digital_fulfillment_status: string
          discount_minor: number
          guest_secret_hash: string | null
          id: string
          idempotency_actor: string
          idempotency_key: string
          locale: string
          market: string
          order_number: string
          order_status: string
          owner_user_id: string | null
          paid_at: string | null
          paid_gate_status: string
          payment_intent: string
          payment_status: string
          payment_terminal_at: string | null
          physical_fulfillment_status: string
          quote_snapshot: Json
          refund_status: string
          refunded_amount_minor: number
          reservation_expires_at: string
          review_reason: string | null
          shipping_address: Json | null
          shipping_minor: number
          status: string
          subtotal_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          accepted_quote_hash: string
          cart_snapshot: Json
          contact_email: string
          created_at?: string
          currency_code: string
          digital_fulfillment_status?: string
          discount_minor?: number
          guest_secret_hash?: string | null
          id?: string
          idempotency_actor: string
          idempotency_key: string
          locale: string
          market: string
          order_number?: string
          order_status?: string
          owner_user_id?: string | null
          paid_at?: string | null
          paid_gate_status?: string
          payment_intent: string
          payment_status?: string
          payment_terminal_at?: string | null
          physical_fulfillment_status?: string
          quote_snapshot: Json
          refund_status?: string
          refunded_amount_minor?: number
          reservation_expires_at: string
          review_reason?: string | null
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor: number
          total_minor: number
          updated_at?: string
        }
        Update: {
          accepted_quote_hash?: string
          cart_snapshot?: Json
          contact_email?: string
          created_at?: string
          currency_code?: string
          digital_fulfillment_status?: string
          discount_minor?: number
          guest_secret_hash?: string | null
          id?: string
          idempotency_actor?: string
          idempotency_key?: string
          locale?: string
          market?: string
          order_number?: string
          order_status?: string
          owner_user_id?: string | null
          paid_at?: string | null
          paid_gate_status?: string
          payment_intent?: string
          payment_status?: string
          payment_terminal_at?: string | null
          physical_fulfillment_status?: string
          quote_snapshot?: Json
          refund_status?: string
          refunded_amount_minor?: number
          reservation_expires_at?: string
          review_reason?: string | null
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          display_order: number
          product_id: string
        }
        Insert: {
          collection_id: string
          display_order: number
          product_id: string
        }
        Update: {
          collection_id?: string
          display_order?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_translations: {
        Row: {
          collection_id: string
          description: string
          id: string
          locale: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          social_image_bucket: string | null
          social_image_path: string | null
        }
        Insert: {
          collection_id: string
          description?: string
          id?: string
          locale: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          social_image_bucket?: string | null
          social_image_path?: string | null
        }
        Update: {
          collection_id?: string
          description?: string
          id?: string
          locale?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          social_image_bucket?: string | null
          social_image_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_translations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commerce_audit_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_key: string
          event_type: string
          id: string
          metadata: Json
          order_id: string | null
          payment_id: string | null
          payment_transition_id: string | null
          source: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          payment_transition_id?: string | null
          source: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          payment_transition_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_transition_id_fkey"
            columns: ["payment_transition_id"]
            isOneToOne: false
            referencedRelation: "payment_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_shipping_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          country_code: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          locality: string | null
          phone_number: string
          postal_code: string | null
          recipient_name: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          country_code: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          locality?: string | null
          phone_number: string
          postal_code?: string | null
          recipient_name: string
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          locality?: string | null
          phone_number?: string
          postal_code?: string | null
          recipient_name?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      digital_access_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          entitlement_id: string
          expires_at: string
          id: string
          purpose: string
          revoked_at: string | null
          status: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          entitlement_id: string
          expires_at: string
          id?: string
          purpose?: string
          revoked_at?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          entitlement_id?: string
          expires_at?: string
          id?: string
          purpose?: string
          revoked_at?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_access_tokens_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "digital_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_entitlements: {
        Row: {
          contact_email: string
          created_at: string
          granted_by_payment_transition_id: string | null
          id: string
          order_id: string
          order_line_id: string
          owner_user_id: string | null
          product_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
          variant_id: string | null
          version: number
        }
        Insert: {
          contact_email: string
          created_at?: string
          granted_by_payment_transition_id?: string | null
          id?: string
          order_id: string
          order_line_id: string
          owner_user_id?: string | null
          product_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Update: {
          contact_email?: string
          created_at?: string
          granted_by_payment_transition_id?: string | null
          id?: string
          order_id?: string
          order_line_id?: string
          owner_user_id?: string | null
          product_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "digital_entitlements_granted_by_payment_transition_id_fkey"
            columns: ["granted_by_payment_transition_id"]
            isOneToOne: false
            referencedRelation: "payment_transitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "digital_entitlements_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "checkout_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_categories: {
        Row: {
          category_id: string
          created_at: string
          discount_code_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          discount_code_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          discount_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_categories_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_collections: {
        Row: {
          collection_id: string
          created_at: string
          discount_code_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          discount_code_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          discount_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_collections_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_customers: {
        Row: {
          created_at: string
          discount_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_customers_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_products: {
        Row: {
          created_at: string
          discount_code_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          discount_code_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          discount_code_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_products_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean
          amount_minor: number | null
          code: string
          created_at: string
          currency_code: string | null
          description: string
          discount_type: string
          ends_at: string | null
          id: string
          market: string | null
          minimum_subtotal_minor: number
          percentage_bps: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          amount_minor?: number | null
          code: string
          created_at?: string
          currency_code?: string | null
          description?: string
          discount_type: string
          ends_at?: string | null
          id?: string
          market?: string | null
          minimum_subtotal_minor?: number
          percentage_bps?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          amount_minor?: number | null
          code?: string
          created_at?: string
          currency_code?: string | null
          description?: string
          discount_type?: string
          ends_at?: string | null
          id?: string
          market?: string | null
          minimum_subtotal_minor?: number
          percentage_bps?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      discount_redemptions: {
        Row: {
          amount_minor: number
          checkout_draft_id: string | null
          committed_at: string | null
          created_at: string
          currency_code: string
          discount_code_id: string
          id: string
          order_id: string | null
          quote_hash: string
          status: string
          user_id: string | null
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          checkout_draft_id?: string | null
          committed_at?: string | null
          created_at?: string
          currency_code: string
          discount_code_id: string
          id?: string
          order_id?: string | null
          quote_hash: string
          status?: string
          user_id?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          checkout_draft_id?: string | null
          committed_at?: string | null
          created_at?: string
          currency_code?: string
          discount_code_id?: string
          id?: string
          order_id?: string | null
          quote_hash?: string
          status?: string
          user_id?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_audit_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          entitlement_id: string | null
          event_key: string
          event_type: string
          id: string
          metadata: Json
          order_id: string | null
          physical_fulfillment_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entitlement_id?: string | null
          event_key: string
          event_type: string
          id?: string
          metadata?: Json
          order_id?: string | null
          physical_fulfillment_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entitlement_id?: string | null
          event_key?: string
          event_type?: string
          id?: string
          metadata?: Json
          order_id?: string | null
          physical_fulfillment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_audit_events_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "digital_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "fulfillment_audit_events_physical_fulfillment_id_fkey"
            columns: ["physical_fulfillment_id"]
            isOneToOne: false
            referencedRelation: "physical_fulfillments"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_order_access_tokens: {
        Row: {
          consumed_at: string | null
          contact_email: string
          created_at: string
          expires_at: string
          id: string
          order_id: string
          purpose: string
          status: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          contact_email: string
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          purpose: string
          status?: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          contact_email?: string
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          purpose?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_order_access_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_order_access_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
        ]
      }
      inventory_records: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          quantity_on_hand: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity_on_hand?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity_on_hand?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_records_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_exception_grants: {
        Row: {
          consumed_at: string | null
          consumed_order_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          destination_country_code: string
          expires_at: string
          id: string
          market: string
          product_id: string
          request_id: string
          shipping_fee_minor: number
          status: string
          token_hash: string
          variant_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          destination_country_code: string
          expires_at: string
          id?: string
          market: string
          product_id: string
          request_id: string
          shipping_fee_minor: number
          status?: string
          token_hash: string
          variant_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          consumed_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          destination_country_code?: string
          expires_at?: string
          id?: string
          market?: string
          product_id?: string
          request_id?: string
          shipping_fee_minor?: number
          status?: string
          token_hash?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_exception_grants_consumed_order_id_fkey"
            columns: ["consumed_order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_exception_grants_consumed_order_id_fkey"
            columns: ["consumed_order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "market_exception_grants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_exception_grants_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "market_exception_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_exception_grants_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_exception_requests: {
        Row: {
          admin_note: string | null
          contact_email: string
          created_at: string
          customer_note: string
          decided_at: string | null
          decided_by: string | null
          destination_country_code: string
          id: string
          locale: string
          market: string
          product_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          admin_note?: string | null
          contact_email: string
          created_at?: string
          customer_note?: string
          decided_at?: string | null
          decided_by?: string | null
          destination_country_code: string
          id?: string
          locale: string
          market: string
          product_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          admin_note?: string | null
          contact_email?: string
          created_at?: string
          customer_note?: string
          decided_at?: string | null
          decided_by?: string | null
          destination_country_code?: string
          id?: string
          locale?: string
          market?: string
          product_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_exception_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_exception_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_consent_events: {
        Row: {
          consent_source: string
          event_type: string
          id: string
          ip_hash: string | null
          locale: string
          market: string
          normalized_email: string
          occurred_at: string
          user_agent_hash: string | null
        }
        Insert: {
          consent_source: string
          event_type: string
          id?: string
          ip_hash?: string | null
          locale: string
          market: string
          normalized_email: string
          occurred_at?: string
          user_agent_hash?: string | null
        }
        Update: {
          consent_source?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          locale?: string
          market?: string
          normalized_email?: string
          occurred_at?: string
          user_agent_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_consent_events_normalized_email_fkey"
            columns: ["normalized_email"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["normalized_email"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          latest_locale: string
          latest_market: string
          normalized_email: string
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          latest_locale: string
          latest_market: string
          normalized_email: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          latest_locale?: string
          latest_market?: string
          normalized_email?: string
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_unsubscribe_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          normalized_email: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          normalized_email: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          normalized_email?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_unsubscribe_tokens_normalized_email_fkey"
            columns: ["normalized_email"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["normalized_email"]
          },
        ]
      }
      payment_events: {
        Row: {
          delivery_count: number
          event_type: string
          id: string
          last_received_at: string
          payload_digest: string | null
          payment_id: string
          provider: string
          provider_event_id: string | null
          received_at: string
          sanitized_facts: Json
          source: string
          verification_status: string
        }
        Insert: {
          delivery_count?: number
          event_type: string
          id?: string
          last_received_at?: string
          payload_digest?: string | null
          payment_id: string
          provider: string
          provider_event_id?: string | null
          received_at?: string
          sanitized_facts?: Json
          source: string
          verification_status: string
        }
        Update: {
          delivery_count?: number
          event_type?: string
          id?: string
          last_received_at?: string
          payload_digest?: string | null
          payment_id?: string
          provider?: string
          provider_event_id?: string | null
          received_at?: string
          sanitized_facts?: Json
          source?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transitions: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          from_status: string
          id: string
          inventory_effect: string
          metadata: Json
          payment_event_id: string | null
          payment_id: string
          reason: string | null
          result: string
          source: string
          to_status: string
          transition_key: string
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          from_status: string
          id?: string
          inventory_effect?: string
          metadata?: Json
          payment_event_id?: string | null
          payment_id: string
          reason?: string | null
          result: string
          source: string
          to_status: string
          transition_key: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          from_status?: string
          id?: string
          inventory_effect?: string
          metadata?: Json
          payment_event_id?: string | null
          payment_id?: string
          reason?: string | null
          result?: string
          source?: string
          to_status?: string
          transition_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transitions_payment_event_id_fkey"
            columns: ["payment_event_id"]
            isOneToOne: false
            referencedRelation: "payment_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transitions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "payment_transitions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency_code: string
          digital_fulfillment_status: string
          id: string
          order_id: string
          paid_at: string | null
          paid_gate_opened_at: string | null
          pending_deadline_at: string
          physical_fulfillment_status: string
          provider: string
          provider_capture_id: string | null
          provider_order_id: string | null
          provider_reference: string | null
          provider_request_id: string | null
          refund_status: string
          refunded_amount_minor: number
          request_id: string | null
          review_reason: string | null
          sanitized_evidence: Json
          status: string
          terminal_at: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency_code: string
          digital_fulfillment_status?: string
          id?: string
          order_id: string
          paid_at?: string | null
          paid_gate_opened_at?: string | null
          pending_deadline_at: string
          physical_fulfillment_status?: string
          provider: string
          provider_capture_id?: string | null
          provider_order_id?: string | null
          provider_reference?: string | null
          provider_request_id?: string | null
          refund_status?: string
          refunded_amount_minor?: number
          request_id?: string | null
          review_reason?: string | null
          sanitized_evidence?: Json
          status?: string
          terminal_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency_code?: string
          digital_fulfillment_status?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          paid_gate_opened_at?: string | null
          pending_deadline_at?: string
          physical_fulfillment_status?: string
          provider?: string
          provider_capture_id?: string | null
          provider_order_id?: string | null
          provider_reference?: string | null
          provider_request_id?: string | null
          refund_status?: string
          refunded_amount_minor?: number
          request_id?: string | null
          review_reason?: string | null
          sanitized_evidence?: Json
          status?: string
          terminal_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
        ]
      }
      physical_fulfillment_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          physical_fulfillment_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          physical_fulfillment_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          physical_fulfillment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "physical_fulfillment_events_physical_fulfillment_id_fkey"
            columns: ["physical_fulfillment_id"]
            isOneToOne: false
            referencedRelation: "physical_fulfillments"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_fulfillments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          version: number
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "physical_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_digital_assets: {
        Row: {
          bucket_id: string
          byte_size: number
          checksum_sha256: string | null
          content_type: string
          created_at: string
          file_name: string
          id: string
          is_private: boolean
          object_path: string
          product_id: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          byte_size: number
          checksum_sha256?: string | null
          content_type?: string
          created_at?: string
          file_name: string
          id?: string
          is_private?: boolean
          object_path: string
          product_id: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          byte_size?: number
          checksum_sha256?: string | null
          content_type?: string
          created_at?: string
          file_name?: string
          id?: string
          is_private?: boolean
          object_path?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_digital_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_market_offers: {
        Row: {
          created_at: string
          currency_code: string
          enabled: boolean
          id: string
          market_code: string
          price_minor: number | null
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          enabled?: boolean
          id?: string
          market_code: string
          price_minor?: number | null
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          enabled?: boolean
          id?: string
          market_code?: string
          price_minor?: number | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_market_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text_en: string
          alt_text_vi: string
          bucket_id: string
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          object_path: string
          product_id: string
        }
        Insert: {
          alt_text_en?: string
          alt_text_vi?: string
          bucket_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          object_path: string
          product_id: string
        }
        Update: {
          alt_text_en?: string
          alt_text_vi?: string
          bucket_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          object_path?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved_at: string | null
          body: string | null
          created_at: string
          hidden_at: string | null
          id: string
          moderation_note: string | null
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          body?: string | null
          created_at?: string
          hidden_at?: string | null
          id?: string
          moderation_note?: string | null
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          body?: string | null
          created_at?: string
          hidden_at?: string | null
          id?: string
          moderation_note?: string | null
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_shipping_profiles: {
        Row: {
          created_at: string
          product_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_shipping_profiles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_shipping_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "shipping_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_techniques: {
        Row: {
          product_id: string
          technique_id: string
        }
        Insert: {
          product_id: string
          technique_id: string
        }
        Update: {
          product_id?: string
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_techniques_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          created_at: string
          description: string
          id: string
          locale: string
          product_id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          social_image_bucket: string | null
          social_image_path: string | null
          specifications: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          locale: string
          product_id: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          social_image_bucket?: string | null
          social_image_path?: string | null
          specifications?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          locale?: string
          product_id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          social_image_bucket?: string | null
          social_image_path?: string | null
          specifications?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          display_order: number
          id: string
          media_id: string | null
          product_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          attributes: Json
          created_at?: string
          display_order?: number
          id?: string
          media_id?: string | null
          product_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          display_order?: number
          id?: string
          media_id?: string | null
          product_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "product_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_type: string
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_type: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_type?: string
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          preferred_locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          preferred_locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          preferred_locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_admin_replies: {
        Row: {
          admin_user_id: string
          body: string
          created_at: string
          review_id: string
          updated_at: string
          version: number
        }
        Insert: {
          admin_user_id: string
          body: string
          created_at?: string
          review_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          admin_user_id?: string
          body?: string
          created_at?: string
          review_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_admin_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "approved_product_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_admin_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_profiles: {
        Row: {
          active: boolean
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_rules: {
        Row: {
          active: boolean
          additional_item_fee_minor: number
          country_code: string
          created_at: string
          currency_code: string
          first_item_fee_minor: number
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          additional_item_fee_minor: number
          country_code: string
          created_at?: string
          currency_code: string
          first_item_fee_minor: number
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          additional_item_fee_minor?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          first_item_fee_minor?: number
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "shipping_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          id: string
          locale: string
          name: string
          tag_id: string
        }
        Insert: {
          id?: string
          locale: string
          name: string
          tag_id: string
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      technique_translations: {
        Row: {
          description: string
          id: string
          locale: string
          name: string
          technique_id: string
        }
        Insert: {
          description?: string
          id?: string
          locale: string
          name: string
          technique_id: string
        }
        Update: {
          description?: string
          id?: string
          locale?: string
          name?: string
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_translations_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactional_email_outbox: {
        Row: {
          available_at: string
          created_at: string
          entitlement_id: string | null
          event_type: string
          id: string
          locale: string
          order_id: string | null
          payload: Json
          recipient_email: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          available_at?: string
          created_at?: string
          entitlement_id?: string | null
          event_type: string
          id?: string
          locale: string
          order_id?: string | null
          payload?: Json
          recipient_email: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          available_at?: string
          created_at?: string
          entitlement_id?: string | null
          event_type?: string
          id?: string
          locale?: string
          order_id?: string | null
          payload?: Json
          recipient_email?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactional_email_outbox_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "digital_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactional_email_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactional_email_outbox_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          note: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          note?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          note?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      variant_market_offers: {
        Row: {
          created_at: string
          currency_code: string
          enabled: boolean
          id: string
          market_code: string
          price_minor: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          enabled?: boolean
          id?: string
          market_code: string
          price_minor: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          enabled?: boolean
          id?: string
          market_code?: string
          price_minor?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_market_offers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_shipping_profiles: {
        Row: {
          created_at: string
          profile_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_shipping_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "shipping_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_shipping_profiles_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_order_timelines: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_type: string | null
          order_id: string | null
          payment_id: string | null
          payment_transition_id: string | null
          sanitized_facts: Json | null
          source: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_type?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_transition_id?: string | null
          sanitized_facts?: Json | null
          source?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_type?: string | null
          order_id?: string | null
          payment_id?: string | null
          payment_transition_id?: string | null
          sanitized_facts?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_audit_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "order_payment_statuses"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_audit_events_payment_transition_id_fkey"
            columns: ["payment_transition_id"]
            isOneToOne: false
            referencedRelation: "payment_transitions"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_product_reviews: {
        Row: {
          approved_at: string | null
          body: string | null
          created_at: string | null
          id: string | null
          masked_author: string | null
          product_id: string | null
          rating: number | null
          shop_reply_body: string | null
          shop_reply_updated_at: string | null
          title: string | null
          updated_at: string | null
          verified_purchase: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_statuses: {
        Row: {
          contact_email: string | null
          created_at: string | null
          currency_code: string | null
          customer_payment_status: string | null
          digital_fulfillment_status: string | null
          fulfillment_gate_status: string | null
          guest_secret_hash: string | null
          locale: string | null
          market: string | null
          order_id: string | null
          order_number: string | null
          owner_user_id: string | null
          payment_id: string | null
          payment_intent: string | null
          payment_status: string | null
          physical_fulfillment_status: string | null
          provider: string | null
          refund_status: string | null
          refunded_amount_minor: number | null
          reservation_expires_at: string | null
          review_reason: string | null
          shipping_address: Json | null
          total_minor: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_payment_transition: { Args: { p_payload: Json }; Returns: Json }
      can_review_product: { Args: { p_product_id: string }; Returns: boolean }
      catalog_publish_issues: {
        Args: { target_product_id: string }
        Returns: {
          detail: string
          issue_code: string
          locale: string
          market_code: string
        }[]
      }
      catalog_valid_locale: { Args: { value: string }; Returns: boolean }
      catalog_valid_market: { Args: { value: string }; Returns: boolean }
      catalog_validate_locale_market: {
        Args: { locale: string; market: string }
        Returns: undefined
      }
      checkout_available_inventory: {
        Args: { p_inventory_record_id: string }
        Returns: number
      }
      checkout_reservation_expires_at: {
        Args: { p_now?: string; p_payment_intent: string }
        Returns: string
      }
      create_market_exception_request: {
        Args: { p_payload: Json }
        Returns: Json
      }
      delete_customer_shipping_address: {
        Args: { p_address_id: string }
        Returns: Json
      }
      expire_due_payments: { Args: { p_limit?: number }; Returns: Json }
      get_admin_order_timeline: {
        Args: { p_order_id: string }
        Returns: {
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_type: string | null
          order_id: string | null
          payment_id: string | null
          payment_transition_id: string | null
          sanitized_facts: Json | null
          source: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_order_timelines"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_admin_product_reviews: {
        Args: { p_status?: string }
        Returns: {
          customer_email: string
          product_id: string
          product_title: string
          rating: number
          reply_body: string
          reply_updated_at: string
          reply_version: number
          review_body: string
          review_id: string
          review_status: string
          review_title: string
          review_version: number
          submitted_at: string
          updated_at: string
        }[]
      }
      get_catalog_category_by_slug: {
        Args: { p_locale: string; p_market: string; p_slug: string }
        Returns: {
          category_id: string
          description: string
          localized_slugs: Json
          name: string
          product_count: number
          seo_description: string
          seo_title: string
          slug: string
          social_image_bucket: string
          social_image_path: string
        }[]
      }
      get_catalog_collection_by_slug: {
        Args: { p_locale: string; p_market: string; p_slug: string }
        Returns: {
          collection_id: string
          description: string
          localized_slugs: Json
          name: string
          product_count: number
          seo_description: string
          seo_title: string
          slug: string
          social_image_bucket: string
          social_image_path: string
        }[]
      }
      get_catalog_product_by_slug: {
        Args: { p_locale: string; p_market: string; p_slug: string }
        Returns: {
          available: boolean
          currency_code: string
          description: string
          in_stock: boolean
          localized_slugs: Json
          other_market_code: string
          price_minor: number
          primary_image_alt: string
          primary_image_bucket: string
          primary_image_path: string
          product_id: string
          product_type: string
          seo_description: string
          seo_title: string
          slug: string
          social_image_bucket: string
          social_image_path: string
          specifications: Json
          title: string
          variants: Json
        }[]
      }
      get_checkout_discount_code: {
        Args: { p_code: string }
        Returns: {
          active: boolean
          amount_minor: number
          code: string
          currency_code: string
          discount_type: string
          eligible_category_ids: string[]
          eligible_collection_ids: string[]
          eligible_customer_ids: string[]
          eligible_product_ids: string[]
          ends_at: string
          id: string
          market: string
          minimum_subtotal_minor: number
          percentage_bps: number
          starts_at: string
          usage_limit: number
          used_count: number
        }[]
      }
      get_checkout_product_discount_scopes: {
        Args: { p_product_ids: string[] }
        Returns: {
          category_ids: string[]
          collection_ids: string[]
          product_id: string
        }[]
      }
      get_checkout_shipping_rules: {
        Args: {
          p_country_code: string
          p_product_ids: string[]
          p_variant_ids: string[]
        }
        Returns: {
          additional_item_fee_minor: number
          country_code: string
          first_item_fee_minor: number
          product_id: string
          variant_id: string
        }[]
      }
      get_customer_wishlist: {
        Args: { p_locale: string; p_market: string }
        Returns: {
          available: boolean
          created_at: string
          currency_code: string
          description: string
          in_stock: boolean
          price_minor: number
          primary_image_alt: string
          primary_image_bucket: string
          primary_image_path: string
          product_id: string
          product_status: string
          product_type: string
          slug: string
          title: string
          variants: Json
          wishlist_item_id: string
        }[]
      }
      get_order_payment_status: {
        Args: { p_guest_secret_hash?: string; p_order_number: string }
        Returns: Json
      }
      list_catalog_facets: {
        Args: { p_locale: string; p_market: string }
        Returns: {
          facet_type: string
          id: string
          label: string
          product_count: number
          slug: string
        }[]
      }
      list_catalog_products: {
        Args: {
          p_category_slug?: string
          p_locale: string
          p_market: string
          p_product_type?: string
          p_search?: string
          p_sort?: string
          p_tag_id?: string
          p_technique_id?: string
        }
        Returns: {
          currency_code: string
          description: string
          in_stock: boolean
          price_minor: number
          primary_image_alt: string
          primary_image_bucket: string
          primary_image_path: string
          product_id: string
          product_type: string
          published_at: string
          slug: string
          title: string
        }[]
      }
      mask_review_author: { Args: { value: string }; Returns: string }
      moderate_product_review: {
        Args: {
          p_expected_status: string
          p_expected_version: number
          p_moderation_note: string
          p_review_id: string
          p_target_status: string
        }
        Returns: Json
      }
      publish_catalog_product: {
        Args: { target_product_id: string }
        Returns: {
          published: boolean
        }[]
      }
      reissue_digital_access_token: {
        Args: {
          p_entitlement_id: string
          p_expected_version: number
          p_new_token_hash: string
        }
        Returns: Json
      }
      remove_review_admin_reply: {
        Args: {
          p_expected_reply_version: number
          p_expected_review_status: string
          p_expected_review_version: number
          p_review_id: string
        }
        Returns: Json
      }
      revoke_digital_entitlement: {
        Args: {
          p_entitlement_id: string
          p_expected_version: number
          p_reason: string
        }
        Returns: Json
      }
      save_customer_shipping_address: {
        Args: {
          p_address_id: string
          p_address_line_1: string
          p_address_line_2: string
          p_country_code: string
          p_is_default: boolean
          p_label: string
          p_locality: string
          p_phone_number: string
          p_postal_code: string
          p_recipient_name: string
          p_region: string
        }
        Returns: Json
      }
      set_default_customer_shipping_address: {
        Args: { p_address_id: string }
        Returns: Json
      }
      submit_checkout: { Args: { p_payload: Json }; Returns: Json }
      submit_product_review: {
        Args: {
          p_body: string
          p_product_id: string
          p_rating: number
          p_title: string
        }
        Returns: Json
      }
      subscribe_newsletter: {
        Args: {
          p_email: string
          p_ip_hash: string
          p_locale: string
          p_market: string
          p_source: string
          p_user_agent_hash: string
        }
        Returns: Json
      }
      unsubscribe_newsletter: { Args: { p_token_hash: string }; Returns: Json }
      upsert_review_admin_reply: {
        Args: {
          p_body: string
          p_expected_review_status: string
          p_expected_review_version: number
          p_review_id: string
        }
        Returns: Json
      }
      validate_market_exception_grant: {
        Args: { p_token_hash: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

