// ============================================
// Shared application types
// ============================================

export type {
  Photographer,
  StudioProfile,
  StudioPackage,
  OtpSession,
  ActiveSession,
  Plan,
  Subscription,
  Client,
  Booking,
  CalendarBlock,
  Agreement,
  Gallery,
  GalleryPhoto,
  GalleryAccessLog,
  PaymentRecord,
  Invoice,
  NotificationLog,
  ClientFeedback,
  Enquiry,
  PortfolioShowcase,
  ClientAccount,
  SearchIndexEntry,
  Database,
} from "./database";

// ---------- API response envelope ----------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------- Pagination ----------
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---------- Auth ----------
export interface AuthUser {
  id: string;
  phone: string;
  role: "photographer" | "client";
  studioId?: string;
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

// ---------- Gallery sharing ----------
export interface GallerySharePayload {
  galleryId: string;
  clientPhone: string;
  clientName: string;
  message?: string;
}

// ---------- Upload ----------
export interface UploadPresignedUrlRequest {
  galleryId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface UploadPresignedUrlResponse {
  uploadUrl: string;
  key: string;
  photoId: string;
}

// ---------- Booking ----------
export interface BookingCreatePayload {
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  title: string;
  eventType?: string;
  eventDate?: string;
  eventEndDate?: string;
  eventTime?: string;
  venue?: string;
  venueAddress?: string;
  city?: string;
  packageId?: string;
  totalAmount: number; // in paise
  advanceAmount?: number; // in paise
  notes?: string;
  internalNotes?: string;
  teamMembers?: string[];
}

// ---------- Booking with client (joined) ----------
export interface BookingWithClient {
  id: string;
  photographer_id: string;
  client_id: string;
  package_id: string | null;
  booking_ref: string;
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
  client: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    whatsapp: string | null;
  };
}

// ---------- Calendar ----------
export interface CalendarBlockEnriched {
  block_id: string;
  block_date: string; // YYYY-MM-DD (start_date)
  end_date: string; // YYYY-MM-DD
  status: string; // BOOKED / ENQUIRY / BLOCKED
  source: string; // BOOKING / MANUAL
  booking_id: string | null;
  booking_ref: string | null;
  client_name: string | null;
  event_type: string | null;
  notes: string | null; // reason field
}

export interface CalendarMonthResponse {
  year: number;
  month: number;
  blocks: CalendarBlockEnriched[];
}

export interface PublicAvailabilityResponse {
  studio_slug: string;
  from_date: string;
  to_date: string;
  dates: Record<string, "FREE" | "BOOKED" | "ENQUIRY">;
}

export interface DateCheckResponse {
  date: string;
  available: boolean;
  status: "FREE" | "BOOKED" | "ENQUIRY" | "BLOCKED";
}

export interface BlockDatesPayload {
  date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  notes?: string; // max 200 chars
}

export interface BlockDatesResponse {
  blocked: number;
  dates: string[];
}

// ---------- Payment ----------
export interface CreatePaymentOrderPayload {
  amount: number; // in paise
  bookingId?: string;
  type: "subscription" | "booking_advance" | "booking_final";
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
