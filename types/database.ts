// ============================================
// Supabase Database Types — 22 tables
// Regenerate with: npx supabase gen types typescript
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {

      // ── 1. photographers ──
      photographers: {
        Row: {
          id: string;
          auth_id: string;
          full_name: string;
          phone: string;
          email: string | null;
          avatar_url: string | null;
          is_onboarded: boolean;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          full_name: string;
          phone: string;
          email?: string | null;
          avatar_url?: string | null;
          is_onboarded?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          avatar_url?: string | null;
          is_onboarded?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 2. studio_profiles ──
      studio_profiles: {
        Row: {
          id: string;
          photographer_id: string;
          name: string;
          slug: string;
          tagline: string | null;
          bio: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string;
          email: string | null;
          whatsapp: string | null;
          website: string | null;
          instagram: string | null;
          facebook: string | null;
          youtube: string | null;
          address_line: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          latitude: number | null;
          longitude: number | null;
          specializations: string[];
          languages: string[];
          starting_price: number | null;
          currency: string;
          is_verified: boolean;
          is_listed: boolean;
          total_bookings: number;
          avg_rating: number;
          storage_used_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          name: string;
          slug: string;
          tagline?: string | null;
          bio?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone: string;
          email?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          youtube?: string | null;
          address_line?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          specializations?: string[];
          languages?: string[];
          starting_price?: number | null;
          currency?: string;
          is_verified?: boolean;
          is_listed?: boolean;
          total_bookings?: number;
          avg_rating?: number;
          storage_used_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          name?: string;
          slug?: string;
          tagline?: string | null;
          bio?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string;
          email?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          instagram?: string | null;
          facebook?: string | null;
          youtube?: string | null;
          address_line?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          specializations?: string[];
          languages?: string[];
          starting_price?: number | null;
          currency?: string;
          is_verified?: boolean;
          is_listed?: boolean;
          total_bookings?: number;
          avg_rating?: number;
          storage_used_bytes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 3. studio_packages ──
      studio_packages: {
        Row: {
          id: string;
          studio_id: string;
          name: string;
          description: string | null;
          price: number;
          deliverables: string | null;
          duration_hours: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          studio_id: string;
          name: string;
          description?: string | null;
          price: number;
          deliverables?: string | null;
          duration_hours?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          studio_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          deliverables?: string | null;
          duration_hours?: number | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 4. otp_sessions ──
      otp_sessions: {
        Row: {
          id: string;
          phone: string;
          otp_hash: string;
          channel: string;
          attempts: number;
          max_attempts: number;
          verified: boolean;
          ip_address: string | null;
          user_agent: string | null;
          expires_at: string;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          otp_hash: string;
          channel?: string;
          attempts?: number;
          max_attempts?: number;
          verified?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at: string;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          otp_hash?: string;
          channel?: string;
          attempts?: number;
          max_attempts?: number;
          verified?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };

      // ── 5. active_sessions ──
      active_sessions: {
        Row: {
          id: string;
          photographer_id: string | null;
          client_account_id: string | null;
          device_info: string | null;
          ip_address: string | null;
          user_agent: string | null;
          last_active_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          photographer_id?: string | null;
          client_account_id?: string | null;
          device_info?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          last_active_at?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string | null;
          client_account_id?: string | null;
          device_info?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          last_active_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };

      // ── 6. plans ──
      plans: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tier: string;
          price_monthly: number;
          price_yearly: number;
          max_storage_bytes: number;
          max_galleries: number;
          max_photos_per_gallery: number;
          max_clients: number;
          max_team_members: number;
          features: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          tier: string;
          price_monthly: number;
          price_yearly: number;
          max_storage_bytes: number;
          max_galleries: number;
          max_photos_per_gallery: number;
          max_clients?: number;
          max_team_members?: number;
          features?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          tier?: string;
          price_monthly?: number;
          price_yearly?: number;
          max_storage_bytes?: number;
          max_galleries?: number;
          max_photos_per_gallery?: number;
          max_clients?: number;
          max_team_members?: number;
          features?: Json;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 7. subscriptions ──
      subscriptions: {
        Row: {
          id: string;
          photographer_id: string;
          plan_id: string;
          status: string;
          billing_cycle: string;
          razorpay_subscription_id: string | null;
          razorpay_customer_id: string | null;
          current_period_start: string;
          current_period_end: string;
          trial_ends_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          plan_id: string;
          status?: string;
          billing_cycle?: string;
          razorpay_subscription_id?: string | null;
          razorpay_customer_id?: string | null;
          current_period_start?: string;
          current_period_end: string;
          trial_ends_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          plan_id?: string;
          status?: string;
          billing_cycle?: string;
          razorpay_subscription_id?: string | null;
          razorpay_customer_id?: string | null;
          current_period_start?: string;
          current_period_end?: string;
          trial_ends_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 8. clients ──
      clients: {
        Row: {
          id: string;
          photographer_id: string;
          name: string;
          phone: string;
          email: string | null;
          whatsapp: string | null;
          address: string | null;
          city: string | null;
          notes: string | null;
          tags: string[];
          source: string | null;
          is_active: boolean;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          name: string;
          phone: string;
          email?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          notes?: string | null;
          tags?: string[];
          source?: string | null;
          is_active?: boolean;
          total_spent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          notes?: string | null;
          tags?: string[];
          source?: string | null;
          is_active?: boolean;
          total_spent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 9. bookings ──
      bookings: {
        Row: {
          id: string;
          photographer_id: string;
          client_id: string;
          package_id: string | null;
          title: string;
          event_type: string | null;
          event_date: string | null;
          event_end_date: string | null;
          event_time: string | null;
          venue: string | null;
          venue_address: string | null;
          city: string | null;
          status: string;
          total_amount: number;
          advance_amount: number;
          paid_amount: number;
          balance_amount: number;
          notes: string | null;
          internal_notes: string | null;
          team_members: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          client_id: string;
          package_id?: string | null;
          title: string;
          event_type?: string | null;
          event_date?: string | null;
          event_end_date?: string | null;
          event_time?: string | null;
          venue?: string | null;
          venue_address?: string | null;
          city?: string | null;
          status?: string;
          total_amount?: number;
          advance_amount?: number;
          paid_amount?: number;
          notes?: string | null;
          internal_notes?: string | null;
          team_members?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          client_id?: string;
          package_id?: string | null;
          title?: string;
          event_type?: string | null;
          event_date?: string | null;
          event_end_date?: string | null;
          event_time?: string | null;
          venue?: string | null;
          venue_address?: string | null;
          city?: string | null;
          status?: string;
          total_amount?: number;
          advance_amount?: number;
          paid_amount?: number;
          notes?: string | null;
          internal_notes?: string | null;
          team_members?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 10. calendar_blocks ──
      calendar_blocks: {
        Row: {
          id: string;
          photographer_id: string;
          title: string;
          start_date: string;
          end_date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          title?: string;
          start_date: string;
          end_date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          title?: string;
          start_date?: string;
          end_date?: string;
          reason?: string | null;
        };
        Relationships: [];
      };

      // ── 11. agreements ──
      agreements: {
        Row: {
          id: string;
          photographer_id: string;
          booking_id: string | null;
          client_id: string;
          title: string;
          content: string;
          status: string;
          sent_at: string | null;
          viewed_at: string | null;
          signed_at: string | null;
          signer_name: string | null;
          signer_ip: string | null;
          signature_url: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          booking_id?: string | null;
          client_id: string;
          title: string;
          content: string;
          status?: string;
          sent_at?: string | null;
          viewed_at?: string | null;
          signed_at?: string | null;
          signer_name?: string | null;
          signer_ip?: string | null;
          signature_url?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          booking_id?: string | null;
          client_id?: string;
          title?: string;
          content?: string;
          status?: string;
          sent_at?: string | null;
          viewed_at?: string | null;
          signed_at?: string | null;
          signer_name?: string | null;
          signer_ip?: string | null;
          signature_url?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 12. galleries ──
      galleries: {
        Row: {
          id: string;
          photographer_id: string;
          booking_id: string | null;
          client_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          cover_photo_url: string | null;
          status: string;
          photo_count: number;
          total_size_bytes: number;
          allow_download: boolean;
          allow_selection: boolean;
          selection_limit: number | null;
          selected_count: number;
          pin: string | null;
          watermark_enabled: boolean;
          expires_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          booking_id?: string | null;
          client_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          cover_photo_url?: string | null;
          status?: string;
          photo_count?: number;
          total_size_bytes?: number;
          allow_download?: boolean;
          allow_selection?: boolean;
          selection_limit?: number | null;
          selected_count?: number;
          pin?: string | null;
          watermark_enabled?: boolean;
          expires_at?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          booking_id?: string | null;
          client_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          cover_photo_url?: string | null;
          status?: string;
          photo_count?: number;
          total_size_bytes?: number;
          allow_download?: boolean;
          allow_selection?: boolean;
          selection_limit?: number | null;
          selected_count?: number;
          pin?: string | null;
          watermark_enabled?: boolean;
          expires_at?: string | null;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 13. gallery_photos ──
      gallery_photos: {
        Row: {
          id: string;
          gallery_id: string;
          photographer_id: string;
          storage_key: string;
          thumbnail_key: string | null;
          original_filename: string;
          content_type: string;
          size_bytes: number;
          width: number | null;
          height: number | null;
          sort_order: number;
          is_selected: boolean;
          selected_by: string | null;
          selected_at: string | null;
          is_favorited: boolean;
          caption: string | null;
          exif_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gallery_id: string;
          photographer_id: string;
          storage_key: string;
          thumbnail_key?: string | null;
          original_filename: string;
          content_type: string;
          size_bytes: number;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          is_selected?: boolean;
          selected_by?: string | null;
          selected_at?: string | null;
          is_favorited?: boolean;
          caption?: string | null;
          exif_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gallery_id?: string;
          photographer_id?: string;
          storage_key?: string;
          thumbnail_key?: string | null;
          original_filename?: string;
          content_type?: string;
          size_bytes?: number;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          is_selected?: boolean;
          selected_by?: string | null;
          selected_at?: string | null;
          is_favorited?: boolean;
          caption?: string | null;
          exif_data?: Json | null;
        };
        Relationships: [];
      };

      // ── 14. gallery_access_logs ──
      gallery_access_logs: {
        Row: {
          id: string;
          gallery_id: string;
          client_id: string | null;
          action: string;
          photo_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          gallery_id: string;
          client_id?: string | null;
          action: string;
          photo_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          gallery_id?: string;
          client_id?: string | null;
          action?: string;
          photo_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };

      // ── 15. payment_records ──
      payment_records: {
        Row: {
          id: string;
          photographer_id: string;
          booking_id: string | null;
          client_id: string | null;
          invoice_id: string | null;
          amount: number;
          currency: string;
          status: string;
          method: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          description: string | null;
          payment_date: string;
          receipt_url: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          booking_id?: string | null;
          client_id?: string | null;
          invoice_id?: string | null;
          amount: number;
          currency?: string;
          status?: string;
          method?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          description?: string | null;
          payment_date?: string;
          receipt_url?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          booking_id?: string | null;
          client_id?: string | null;
          invoice_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          method?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          description?: string | null;
          payment_date?: string;
          receipt_url?: string | null;
          notes?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 16. invoices ──
      invoices: {
        Row: {
          id: string;
          photographer_id: string;
          booking_id: string | null;
          client_id: string;
          invoice_number: string;
          status: string;
          subtotal: number;
          tax_percent: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          paid_amount: number;
          balance_amount: number;
          line_items: Json;
          notes: string | null;
          terms: string | null;
          due_date: string | null;
          sent_at: string | null;
          paid_at: string | null;
          pdf_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          booking_id?: string | null;
          client_id: string;
          invoice_number: string;
          status?: string;
          subtotal: number;
          tax_percent?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount: number;
          paid_amount?: number;
          line_items?: Json;
          notes?: string | null;
          terms?: string | null;
          due_date?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          pdf_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          booking_id?: string | null;
          client_id?: string;
          invoice_number?: string;
          status?: string;
          subtotal?: number;
          tax_percent?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          paid_amount?: number;
          line_items?: Json;
          notes?: string | null;
          terms?: string | null;
          due_date?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          pdf_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 17. notification_logs ──
      notification_logs: {
        Row: {
          id: string;
          photographer_id: string | null;
          client_id: string | null;
          channel: string;
          status: string;
          template_name: string;
          recipient_phone: string | null;
          recipient_email: string | null;
          subject: string | null;
          body_preview: string | null;
          provider_response: Json;
          error_message: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          photographer_id?: string | null;
          client_id?: string | null;
          channel: string;
          status?: string;
          template_name: string;
          recipient_phone?: string | null;
          recipient_email?: string | null;
          subject?: string | null;
          body_preview?: string | null;
          provider_response?: Json;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string | null;
          client_id?: string | null;
          channel?: string;
          status?: string;
          template_name?: string;
          recipient_phone?: string | null;
          recipient_email?: string | null;
          subject?: string | null;
          body_preview?: string | null;
          provider_response?: Json;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        Relationships: [];
      };

      // ── 18. client_feedback ──
      client_feedback: {
        Row: {
          id: string;
          photographer_id: string;
          client_id: string;
          booking_id: string | null;
          gallery_id: string | null;
          rating: number;
          review_text: string | null;
          is_public: boolean;
          is_verified: boolean;
          response_text: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          client_id: string;
          booking_id?: string | null;
          gallery_id?: string | null;
          rating: number;
          review_text?: string | null;
          is_public?: boolean;
          is_verified?: boolean;
          response_text?: string | null;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          client_id?: string;
          booking_id?: string | null;
          gallery_id?: string | null;
          rating?: number;
          review_text?: string | null;
          is_public?: boolean;
          is_verified?: boolean;
          response_text?: string | null;
          responded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 19. enquiries ──
      enquiries: {
        Row: {
          id: string;
          photographer_id: string;
          name: string;
          phone: string;
          email: string | null;
          event_type: string | null;
          event_date: string | null;
          venue_city: string | null;
          budget_range: string | null;
          message: string | null;
          status: string;
          source: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          ip_address: string | null;
          converted_booking_id: string | null;
          notes: string | null;
          followed_up_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          name: string;
          phone: string;
          email?: string | null;
          event_type?: string | null;
          event_date?: string | null;
          venue_city?: string | null;
          budget_range?: string | null;
          message?: string | null;
          status?: string;
          source?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          ip_address?: string | null;
          converted_booking_id?: string | null;
          notes?: string | null;
          followed_up_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          event_type?: string | null;
          event_date?: string | null;
          venue_city?: string | null;
          budget_range?: string | null;
          message?: string | null;
          status?: string;
          source?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          ip_address?: string | null;
          converted_booking_id?: string | null;
          notes?: string | null;
          followed_up_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 20. portfolio_showcases ──
      portfolio_showcases: {
        Row: {
          id: string;
          photographer_id: string;
          title: string;
          slug: string;
          description: string | null;
          cover_photo_url: string | null;
          category: string | null;
          status: string;
          photo_keys: string[];
          photo_count: number;
          sort_order: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          photographer_id: string;
          title: string;
          slug: string;
          description?: string | null;
          cover_photo_url?: string | null;
          category?: string | null;
          status?: string;
          photo_keys?: string[];
          photo_count?: number;
          sort_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          photographer_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          cover_photo_url?: string | null;
          category?: string | null;
          status?: string;
          photo_keys?: string[];
          photo_count?: number;
          sort_order?: number;
          published_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 21. client_accounts ──
      client_accounts: {
        Row: {
          id: string;
          auth_id: string | null;
          client_id: string | null;
          photographer_id: string | null;
          phone: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
          last_login_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          client_id?: string | null;
          photographer_id?: string | null;
          phone: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          last_login_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          client_id?: string | null;
          photographer_id?: string | null;
          phone?: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          last_login_at?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── 22. search_index ──
      search_index: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          photographer_id: string | null;
          title: string;
          subtitle: string | null;
          body: string | null;
          city: string | null;
          tags: string[];
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          photographer_id?: string | null;
          title: string;
          subtitle?: string | null;
          body?: string | null;
          city?: string | null;
          tags?: string[];
          search_vector?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          photographer_id?: string | null;
          title?: string;
          subtitle?: string | null;
          body?: string | null;
          city?: string | null;
          tags?: string[];
          search_vector?: unknown | null;
          updated_at?: string;
        };
        Relationships: [];
      };

    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_tier: "starter" | "professional" | "studio";
      subscription_status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
      booking_status: "enquiry" | "confirmed" | "in_progress" | "delivered" | "completed" | "cancelled";
      payment_status: "created" | "authorized" | "captured" | "partially_refunded" | "refunded" | "failed";
      payment_method: "razorpay" | "upi" | "bank_transfer" | "cash" | "cheque" | "other";
      invoice_status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled" | "void";
      notification_channel: "whatsapp" | "sms" | "email" | "push";
      notification_status: "queued" | "sent" | "delivered" | "failed" | "read";
      otp_channel: "whatsapp" | "sms";
      agreement_status: "draft" | "sent" | "viewed" | "signed" | "expired" | "declined";
      enquiry_status: "new" | "contacted" | "qualified" | "converted" | "lost";
      gallery_status: "draft" | "published" | "archived" | "expired";
      showcase_status: "draft" | "published" | "archived";
    };
  };
}

// ============================================
// Convenience Row types
// ============================================
export type Photographer = Database["public"]["Tables"]["photographers"]["Row"];
export type StudioProfile = Database["public"]["Tables"]["studio_profiles"]["Row"];
export type StudioPackage = Database["public"]["Tables"]["studio_packages"]["Row"];
export type OtpSession = Database["public"]["Tables"]["otp_sessions"]["Row"];
export type ActiveSession = Database["public"]["Tables"]["active_sessions"]["Row"];
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type CalendarBlock = Database["public"]["Tables"]["calendar_blocks"]["Row"];
export type Agreement = Database["public"]["Tables"]["agreements"]["Row"];
export type Gallery = Database["public"]["Tables"]["galleries"]["Row"];
export type GalleryPhoto = Database["public"]["Tables"]["gallery_photos"]["Row"];
export type GalleryAccessLog = Database["public"]["Tables"]["gallery_access_logs"]["Row"];
export type PaymentRecord = Database["public"]["Tables"]["payment_records"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type NotificationLog = Database["public"]["Tables"]["notification_logs"]["Row"];
export type ClientFeedback = Database["public"]["Tables"]["client_feedback"]["Row"];
export type Enquiry = Database["public"]["Tables"]["enquiries"]["Row"];
export type PortfolioShowcase = Database["public"]["Tables"]["portfolio_showcases"]["Row"];
export type ClientAccount = Database["public"]["Tables"]["client_accounts"]["Row"];
export type SearchIndexEntry = Database["public"]["Tables"]["search_index"]["Row"];

// ============================================
// Insert types
// ============================================
export type PhotographerInsert = Database["public"]["Tables"]["photographers"]["Insert"];
export type StudioProfileInsert = Database["public"]["Tables"]["studio_profiles"]["Insert"];
export type StudioPackageInsert = Database["public"]["Tables"]["studio_packages"]["Insert"];
export type OtpSessionInsert = Database["public"]["Tables"]["otp_sessions"]["Insert"];
export type ActiveSessionInsert = Database["public"]["Tables"]["active_sessions"]["Insert"];
export type PlanInsert = Database["public"]["Tables"]["plans"]["Insert"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
export type CalendarBlockInsert = Database["public"]["Tables"]["calendar_blocks"]["Insert"];
export type AgreementInsert = Database["public"]["Tables"]["agreements"]["Insert"];
export type GalleryInsert = Database["public"]["Tables"]["galleries"]["Insert"];
export type GalleryPhotoInsert = Database["public"]["Tables"]["gallery_photos"]["Insert"];
export type GalleryAccessLogInsert = Database["public"]["Tables"]["gallery_access_logs"]["Insert"];
export type PaymentRecordInsert = Database["public"]["Tables"]["payment_records"]["Insert"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type NotificationLogInsert = Database["public"]["Tables"]["notification_logs"]["Insert"];
export type ClientFeedbackInsert = Database["public"]["Tables"]["client_feedback"]["Insert"];
export type EnquiryInsert = Database["public"]["Tables"]["enquiries"]["Insert"];
export type PortfolioShowcaseInsert = Database["public"]["Tables"]["portfolio_showcases"]["Insert"];
export type ClientAccountInsert = Database["public"]["Tables"]["client_accounts"]["Insert"];
export type SearchIndexInsert = Database["public"]["Tables"]["search_index"]["Insert"];

// ============================================
// Update types
// ============================================
export type PhotographerUpdate = Database["public"]["Tables"]["photographers"]["Update"];
export type StudioProfileUpdate = Database["public"]["Tables"]["studio_profiles"]["Update"];
export type StudioPackageUpdate = Database["public"]["Tables"]["studio_packages"]["Update"];
export type OtpSessionUpdate = Database["public"]["Tables"]["otp_sessions"]["Update"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];
export type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
export type AgreementUpdate = Database["public"]["Tables"]["agreements"]["Update"];
export type GalleryUpdate = Database["public"]["Tables"]["galleries"]["Update"];
export type GalleryPhotoUpdate = Database["public"]["Tables"]["gallery_photos"]["Update"];
export type PaymentRecordUpdate = Database["public"]["Tables"]["payment_records"]["Update"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];
export type ClientFeedbackUpdate = Database["public"]["Tables"]["client_feedback"]["Update"];
export type EnquiryUpdate = Database["public"]["Tables"]["enquiries"]["Update"];
export type PortfolioShowcaseUpdate = Database["public"]["Tables"]["portfolio_showcases"]["Update"];
export type ClientAccountUpdate = Database["public"]["Tables"]["client_accounts"]["Update"];
export type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];
