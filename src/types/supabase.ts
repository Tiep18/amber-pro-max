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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      publish_catalog_product: {
        Args: { target_product_id: string }
        Returns: {
          published: boolean
        }[]
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

