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
  clientId: string;
  title: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  totalAmount: number; // in paise
  notes?: string;
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
