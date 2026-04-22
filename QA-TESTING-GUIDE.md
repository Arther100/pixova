# 📋 PIXOVA — Complete QA Testing Guide

> **Version:** 1.0  
> **Last Updated:** April 22, 2026  
> **Production URL:** https://www.pixova.in  
> **Platform:** Next.js 14 | Supabase | Cloudflare R2 | Razorpay | Meta WhatsApp Cloud API

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [User Roles & Access](#2-user-roles--access)
3. [Environment & URLs](#3-environment--urls)
4. [Module 1: Authentication (OTP Login)](#module-1-authentication-otp-login)
5. [Module 2: Onboarding (Studio Setup)](#module-2-onboarding-studio-setup)
6. [Module 3: Dashboard](#module-3-dashboard)
7. [Module 4: Bookings Management](#module-4-bookings-management)
8. [Module 5: Calendar & Availability](#module-5-calendar--availability)
9. [Module 6: Gallery Management](#module-6-gallery-management)
10. [Module 7: Payments](#module-7-payments)
11. [Module 8: Agreements](#module-8-agreements)
12. [Module 9: Client Portal](#module-9-client-portal)
13. [Module 10: Messages](#module-10-messages)
14. [Module 11: Reviews & Feedback](#module-11-reviews--feedback)
15. [Module 12: Settings](#module-12-settings)
16. [Module 13: Admin Panel](#module-13-admin-panel)
17. [Module 14: WhatsApp Notifications](#module-14-whatsapp-notifications)
18. [Module 15: Public Pages](#module-15-public-pages)
19. [Module 16: Public Gallery Sharing](#module-16-public-gallery-sharing)
20. [Module 17: Cron Jobs (Scheduled Tasks)](#module-17-cron-jobs-scheduled-tasks)
21. [Module 18: Session Management](#module-18-session-management)
22. [Module 19: Studio Public Profile & Calendar](#module-19-studio-public-profile--calendar)
23. [Subscription Plans & Limits](#subscription-plans--limits)
24. [Business Rules & Validation Rules](#business-rules--validation-rules)
25. [Error Codes Reference](#error-codes-reference)
26. [Complete API Reference](#complete-api-reference)
27. [End-to-End Test Flows](#end-to-end-test-flows)

---

## 1. App Overview

**Pixova** is a photography studio management platform for Indian photographers. It lets photographers manage bookings, deliver photo galleries to clients via WhatsApp links, create service agreements, track payments, and manage their studio profile — all from one dashboard.

### Key Systems
| System | Technology | Purpose |
|--------|-----------|---------|
| Frontend | Next.js 14 (React) | Web application |
| Database | Supabase (PostgreSQL) | Data storage |
| Photo Storage | Cloudflare R2 (S3-compatible) | Photo uploads & delivery |
| Payments | Razorpay | Online payment processing |
| Notifications | Meta WhatsApp Cloud API | OTP, booking alerts, gallery links |
| Hosting | Vercel | Production deployment |
| Auth | JWT (HS256) | Session management |

---

## 2. User Roles & Access

| Role | Description | Auth Method | Cookie Name |
|------|-------------|-------------|-------------|
| **Photographer** | Primary user — manages studio, bookings, galleries | OTP via WhatsApp (phone) | `pixova_session` |
| **Admin** | Pixova internal admin — manages photographers, revenue | Email + Password | `pixova_admin_session` |
| **Client** | Photography client — views booking, gallery, agreement | Portal token (link-based) | `pixova_client_session` |
| **Public** | Unauthenticated visitor | None | None |

### Access Matrix

| Page | Photographer | Admin | Client | Public |
|------|:---:|:---:|:---:|:---:|
| `/login` | ✅ | — | — | ✅ |
| `/dashboard` | ✅ | — | — | — |
| `/bookings` | ✅ | — | — | — |
| `/calendar` | ✅ | — | — | — |
| `/galleries` | ✅ | — | — | — |
| `/clients` | ✅ | — | — | — |
| `/payments` | ✅ | — | — | — |
| `/messages` | ✅ | — | — | — |
| `/reviews` | ✅ | — | — | — |
| `/settings` | ✅ | — | — | — |
| `/onboarding` | ✅ (new user) | — | — | — |
| `/suspended` | ✅ (suspended) | — | — | — |
| `/admin/*` | — | ✅ | — | — |
| `/portal/[token]/*` | — | — | ✅ | — |
| `/g/[slug]` | — | — | — | ✅ |
| `/agreement/[id]` | — | — | ✅ | ✅ |
| `/terms`, `/privacy` | — | — | — | ✅ |

---

## 3. Environment & URLs

| Environment | URL |
|-------------|-----|
| Production | https://www.pixova.in |
| Admin Login | https://www.pixova.in/admin/login |
| Terms | https://www.pixova.in/terms |
| Privacy | https://www.pixova.in/privacy |

### WhatsApp Sender
- **Phone Number:** +91 63696 87944
- **Display Name:** Pixova (pending Meta approval)

---

## Module 1: Authentication (OTP Login)

### Route: `/login`

### What It Does
Photographers log in using their Indian mobile number. An OTP (6-digit code) is sent via WhatsApp. After verification, they get a 7-day session.

### Test Scenarios

#### TC-1.1: Send OTP — Happy Path
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `/login` | Login page loads with phone input field |
| 2 | Enter valid 10-digit phone: `8778667396` | Input accepted, field validates |
| 3 | Click "Send OTP" | Button shows loading spinner |
| 4 | Wait | OTP received on WhatsApp within 10 seconds |
| 5 | Check WhatsApp | Message from Pixova with 6-digit OTP code |

#### TC-1.2: Send OTP — Invalid Phone
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter `12345` (less than 10 digits) | Validation error: "Invalid Indian phone number" |
| 2 | Enter `0000000000` (starts with 0) | Validation error shown |
| 3 | Enter alphabets `abcdefghij` | Validation error shown |

#### TC-1.3: Verify OTP — Correct OTP
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter the correct 6-digit OTP | OTP field validates |
| 2 | Click "Verify" | Loading state → Success |
| 3 | Wait for redirect | **New user:** Redirected to `/onboarding` |
| | | **Existing user:** Redirected to `/dashboard` |
| 4 | Check browser cookies | `pixova_session` cookie set (7-day expiry) |

#### TC-1.4: Verify OTP — Wrong OTP
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter wrong OTP `000000` | Error: "Invalid OTP" |
| 2 | Try 3 more wrong attempts | After 3rd attempt: "Too many attempts. Request a new OTP" |

#### TC-1.5: OTP Expiry
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request OTP | OTP received |
| 2 | Wait 10 minutes | OTP expires |
| 3 | Enter the expired OTP | Error: "OTP expired. Request a new one" |

#### TC-1.6: Resend OTP
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After sending OTP, wait for 30s countdown | "Resend OTP" button becomes active after 30 seconds |
| 2 | Click "Resend OTP" | New OTP sent, old OTP invalidated |

#### TC-1.7: Rate Limiting
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send 5 OTPs for same phone within 1 hour | 6th attempt shows error: "Too many OTP requests" |

#### TC-1.8: Redirect After Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit `/bookings` (protected) without login | Redirected to `/login?redirect=/bookings` |
| 2 | Complete OTP login | Redirected to `/bookings` (not dashboard) |

#### TC-1.9: Already Logged In
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | With active session, visit `/login` | Automatically redirected to `/dashboard` |
| 2 | With active session, visit `/` | Automatically redirected to `/dashboard` |

### Validation Rules
- Phone: Must be 10 digits, start with 6-9 (Indian mobile)
- OTP: Exactly 6 digits
- OTP valid for: 10 minutes
- Max OTP attempts: 3 per session
- Rate limit: 5 OTPs per phone per hour

---

## Module 2: Onboarding (Studio Setup)

### Route: `/onboarding`

### What It Does
New photographers complete a 3-step wizard to set up their studio profile before accessing the dashboard.

### Step 1: Studio Basics

#### TC-2.1: Fill Studio Profile
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter studio name: "Studio Sunshine" | Accepted (min 2 chars, max 100) |
| 2 | Enter slug: "studio-sunshine" | Slug availability checked in real-time |
| 3 | See phone pre-filled from login | Phone field auto-populated |
| 4 | Enter email (optional) | Valid email format accepted |
| 5 | Enter tagline (optional, max 200 chars) | Accepted |
| 6 | Enter bio (optional, max 2000 chars) | Accepted |
| 7 | Enter city, state, pincode | Accepted |
| 8 | Select specializations (multi-select, max 10) | Tags added |
| 9 | Select languages (multi-select, max 10) | Tags added |
| 10 | Enter starting price | Number in INR accepted |
| 11 | Click "Next" | Moves to Step 2 |

#### TC-2.2: Slug Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter slug "ab" | Error: "Slug must be at least 3 characters" |
| 2 | Enter slug "My Studio" (spaces/uppercase) | Error: "Only lowercase, numbers, hyphens" |
| 3 | Enter slug already taken | Error: "This slug is already taken" |
| 4 | Enter valid unique slug | Green checkmark: "Available!" |

### Step 2: Packages

#### TC-2.3: Create Service Package
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Package" | Package form appears |
| 2 | Enter name: "Wedding Premium" | Accepted |
| 3 | Enter description | Accepted |
| 4 | Enter price: 50000 (₹50,000) | Accepted |
| 5 | Add deliverables: "500 edited photos" | List item added |
| 6 | Enter duration: 8 hours | Accepted |
| 7 | Click "Save Package" | Package card appears in list |
| 8 | Must create at least 1 package to proceed | "Next" button enabled after 1+ package |

### Step 3: Go Live

#### TC-2.4: Review & Publish
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Review all entered details | Summary shown |
| 2 | Profile completion score displayed | Score calculated (aim for 50%+) |
| 3 | Click "Go Live" / "Publish" | Studio created in database |
| 4 | Redirected to `/dashboard` | Dashboard loads with studio data |

---

## Module 3: Dashboard

### Route: `/dashboard`

### What It Does
Shows an overview of the photographer's studio with key metrics, upcoming events, subscription status, and quick links.

### Page Elements
| Element | Description |
|---------|-------------|
| Welcome message | "Welcome, {Studio Name}" or photographer name |
| Profile completion bar | Percentage with visual progress bar |
| Total Bookings card | Count of all bookings |
| Pending Enquiries card | Bookings with status = "enquiry" |
| Unread Messages card | Count of unread client messages |
| Total Revenue card | Sum of all payments received (₹) |
| Subscription badge | Current plan name + status |
| Grace Period banner | Yellow banner if in grace period (shows days remaining) |
| Upcoming Events list | Next bookings sorted by event date |

#### TC-3.1: Dashboard Load
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and land on `/dashboard` | All cards load with correct data |
| 2 | Verify booking count matches `/bookings` list | Numbers match |
| 3 | Verify revenue matches `/payments` total | Numbers match |
| 4 | Check upcoming events | Shows next events sorted by date |

#### TC-3.2: Grace Period Banner
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User is in grace period (subscription expired < 15 days) | Yellow banner at top: "Your subscription has expired. Renew to continue." |
| 2 | Click "Renew" on banner | Navigates to `/settings/subscription` |

#### TC-3.3: Profile Completion
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | New user with minimal profile | Low completion percentage shown |
| 2 | Fill more profile fields | Score increases |

---

## Module 4: Bookings Management

### Routes: `/bookings`, `/bookings/new`, `/bookings/[bookingId]`, `/bookings/[bookingId]/edit`

### What It Does
Photographers create, view, edit, and manage client bookings through the full lifecycle.

### Booking Lifecycle (Status Flow)
```
enquiry → confirmed → in_progress → delivered → completed
                  ↘ cancelled (from any status)
```

### Booking Statuses
| Status | Color | Meaning |
|--------|-------|---------|
| `enquiry` | Blue | New lead, not yet confirmed |
| `confirmed` | Green | Booking confirmed, advance received |
| `in_progress` | Orange | Event day or currently shooting |
| `delivered` | Purple | Photos delivered to client |
| `completed` | Gray | Booking fully done and paid |
| `cancelled` | Red | Booking cancelled |

#### TC-4.1: View Bookings List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/bookings` | Paginated list of bookings (20 per page) |
| 2 | Check table columns | Shows: Client name, Event type, Date, Amount, Status, Actions |
| 3 | Verify pagination | "Prev" / "Next" buttons work |
| 4 | Total count shown | Matches actual booking count |

#### TC-4.2: Search Bookings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type client name in search | List filters in real-time |
| 2 | Search by phone number | Matching bookings shown |
| 3 | Search by booking reference (e.g., "BKG-2026-001") | Exact match found |
| 4 | Search with no results | "No bookings found" message |

#### TC-4.3: Filter by Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Confirmed" from status dropdown | Only confirmed bookings shown |
| 2 | Select "All" | All bookings shown |
| 3 | Combine search + filter | Both filters applied simultaneously |

#### TC-4.4: Sort Bookings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sort by "Created Date" (newest first) | Latest bookings at top |
| 2 | Sort by "Event Date" | Sorted by upcoming events |
| 3 | Sort by "Amount" | Highest amount first |

#### TC-4.5: Create New Booking
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Booking" button | Navigates to `/bookings/new` |
| 2 | Fill client name (required) | Accepted |
| 3 | Fill client phone (required, 10-digit Indian) | Validated |
| 4 | Fill client email (optional) | Valid format checked |
| 5 | Select event type (Wedding, Pre-Wedding, etc.) | Dropdown selection |
| 6 | Select event date | Date picker |
| 7 | Enter venue, city | Text fields |
| 8 | Select package (from photographer's packages) | Package details auto-fill price |
| 9 | Enter total amount (₹) | Amount field |
| 10 | Add notes (optional) | Text area |
| 11 | Click "Create Booking" | Booking created, redirected to booking detail |
| 12 | Check booking list | New booking appears at top |
| 13 | Check calendar | Event date auto-blocked on calendar |

#### TC-4.6: View Booking Detail
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a booking from the list | Navigates to `/bookings/[bookingId]` |
| 2 | See full booking details | Client info, event info, package, amounts shown |
| 3 | See booking timeline | Shows lifecycle with timestamps |
| 4 | See payment summary | Total, paid, balance shown |
| 5 | See action buttons | Edit, Change Status, Record Payment, Generate Agreement, etc. |

#### TC-4.7: Edit Booking
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From booking detail, click "Edit" | Navigates to `/bookings/[bookingId]/edit` |
| 2 | Modify event date | Updated |
| 3 | Modify amount | Updated |
| 4 | Click "Save Changes" | Booking updated, returned to detail page |

#### TC-4.8: Change Booking Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From booking detail, click status change button | Status dropdown/modal appears |
| 2 | Change from "enquiry" to "confirmed" | Status updated, WhatsApp notification sent |
| 3 | Check status badge color change | Updates to green |

#### TC-4.9: Quota Warning
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | When booking count reaches plan limit | Yellow "Quota Warning" banner appears |
| 2 | Try creating booking beyond limit | Error or upgrade prompt |

---

## Module 5: Calendar & Availability

### Route: `/calendar`

### What It Does
Shows a monthly calendar view with bookings, enquiries, and manually blocked dates. Photographers can block/unblock dates for unavailability.

### Calendar Color Legend
| Color | Status | Meaning |
|-------|--------|---------|
| Green | BOOKED | Confirmed booking on this date |
| Blue | ENQUIRY | Pending enquiry on this date |
| Red/Gray | BLOCKED | Manually blocked by photographer |
| White | FREE | Available for bookings |

#### TC-5.1: View Calendar
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/calendar` | Current month calendar loads |
| 2 | Check URL | Contains `?year=2026&month=4` (current month) |
| 3 | Booked dates highlighted in green | Matches confirmed bookings |
| 4 | Enquiry dates in blue | Matches enquiry bookings |
| 5 | Blocked dates in red/gray | Matches manual blocks |
| 6 | Legend shown | All 4 colors explained |

#### TC-5.2: Navigate Months
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Next Month" (→) | Shows May 2026 |
| 2 | Click "Previous Month" (←) | Shows March 2026 |
| 3 | URL updates | Reflects new year/month params |
| 4 | Blocks & bookings update | Data refreshes for the new month |

#### TC-5.3: Block Dates
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a free date | Block modal/popover appears |
| 2 | Select start date: April 25 | Start date set |
| 3 | Select end date: April 27 (optional range) | Range selected |
| 4 | Enter reason: "Personal leave" (max 200 chars) | Accepted |
| 5 | Click "Block" | Dates turn red/gray on calendar |
| 6 | Toast notification | "Dates blocked successfully" |

#### TC-5.4: Unblock Date
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a blocked date | Popover shows block details + "Unblock" button |
| 2 | Click "Unblock" | Date turns white (free) |
| 3 | Toast notification | "Date unblocked" |

#### TC-5.5: Click Booked Date
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a booked (green) date | Popover shows booking details |
| 2 | See client name, event type | Booking info displayed |
| 3 | Link to booking detail | Can navigate to `/bookings/[id]` |

#### TC-5.6: Upcoming Events Sidebar
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check sidebar on right | Shows upcoming events list |
| 2 | Events sorted by date | Nearest event first |
| 3 | Each event shows | Client name, event type, date |

---

## Module 6: Gallery Management

### Routes: `/galleries`, `/galleries/[bookingId]`

### What It Does
Photographers create photo galleries linked to bookings, upload photos, and share them with clients. Galleries can be PIN-protected and have download controls.

### Gallery Statuses
| Status | Meaning |
|--------|---------|
| `draft` | Photos being uploaded, not shared yet |
| `published` | Shared with client via link |
| `archived` | Hidden from client, kept in storage |

#### TC-6.1: View Galleries List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/galleries` | List of galleries with photo counts |
| 2 | Storage bar at top | Shows used vs. limit (e.g., "2.5 GB / 10 GB") |
| 3 | Each gallery card shows | Title, status, photo count, file size, date |
| 4 | No galleries state | "Create your first gallery" CTA |

#### TC-6.2: Create Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create Gallery" or navigate via booking | Gallery editor opens at `/galleries/[bookingId]` |
| 2 | Gallery linked to specific booking | Booking details shown |
| 3 | Gallery auto-named | Based on booking/client name |

**Note:** Gallery creation uses a presigned URL upload flow:
1. Frontend requests a presigned upload URL from `/api/v1/galleries/[bookingId]/upload-url`
2. Photo is uploaded directly to Cloudflare R2 (not through the server)
3. Frontend confirms upload via `/api/v1/galleries/[bookingId]/confirm-upload`
4. This means uploads are fast and don't burden the server

#### TC-6.3: Upload Photos
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag & drop photos into upload zone | Upload progress bars shown |
| 2 | Upload JPEG files | Accepted (max 25 MB per photo) |
| 3 | Upload PNG files | Accepted |
| 4 | Upload WebP files | Accepted |
| 5 | Upload HEIC files | Accepted |
| 6 | Upload PDF file | Rejected: "Unsupported file type" |
| 7 | Upload 30 MB file | Rejected: "File too large (max 25 MB)" |
| 8 | Photos appear in grid | Thumbnails generated |
| 9 | Storage bar updates | Reflects new usage |

#### TC-6.4: Gallery Settings
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable PIN protection | PIN input field appears |
| 2 | Set PIN: "1234" | Saved |
| 3 | Enable/disable downloads | Toggle switch works |
| 4 | Set photo selection limit (e.g., 50) | Client can select max 50 photos |
| 5 | Set expiry date | Date picker for gallery access deadline |

#### TC-6.5: Publish Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Publish" button | Confirmation dialog appears |
| 2 | Confirm publish | Status changes to "published" |
| 3 | Share link generated | Two URL formats available: |
| | | Short: `pixova.in/g/studio-name-ref123` |
| | | Long: `pixova.in/{studioSlug}/{galleryId}` |
| 4 | WhatsApp notification sent to client | Contains gallery link |
| 5 | Gallery visible via public link | Client can view photos |

#### TC-6.5.1: Gallery Editor — Advanced Features
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | View client photo selections/picks | Shows which photos client selected |
| 2 | Lock gallery | Prevents further client selections |
| 3 | Unlock gallery | Allows client selections again |
| 4 | Bulk select photos | Select all / deselect all |
| 5 | Reorder photos | Drag-and-drop photo ordering |
| 6 | View client favorites | See which photos client favorited |

#### TC-6.6: Archive Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Archive" on published gallery | Gallery hidden from client |
| 2 | Client visits link | Error: "Gallery not available" |
| 3 | Photos remain in storage | Storage count unchanged |

#### TC-6.7: Delete Photos
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select photo(s) | Selection checkmarks shown |
| 2 | Click "Delete" | Confirmation prompt |
| 3 | Confirm | Photos removed, storage freed |

#### TC-6.8: Storage Limits
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload photos until near storage limit | Warning bar turns yellow/red |
| 2 | Try uploading beyond limit | Error: "Storage limit exceeded" |

#### TC-6.9: Bulk Download (Client Side)
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Client clicks "Download All" | ZIP creation begins |
| 2 | Progress bar shown | Shows batch download progress |
| 3 | Photos downloaded in batches | 5 photos concurrently |
| 4 | Large gallery warning | If >200 photos, shows size warning |
| 5 | ZIP file auto-downloads | On completion, browser downloads ZIP |
| 6 | Download selected only | If selection enabled, only downloads selected photos |

### Upload Constraints
| Rule | Value |
|------|-------|
| Max file size | 25 MB per photo |
| Allowed formats | JPEG, PNG, WebP, HEIC, HEIF |
| Max photos per gallery | 2,000 (plan-dependent) |
| Thumbnail sizes | 320px, 640px, 1280px, 1920px |

---

## Module 7: Payments

### Routes: `/payments`, `/bookings/[bookingId]/payments`

### What It Does
Tracks all payments across bookings. Photographers can record manual payments (cash, UPI, bank transfer) and send Razorpay payment links to clients.

### Payment Statuses
| Status | Condition | Color |
|--------|-----------|-------|
| PENDING | `paid_amount = 0` | Red |
| PARTIAL | `0 < paid_amount < total_amount` | Orange/Amber |
| PAID | `paid_amount >= total_amount` | Green |
| OVERPAID | `paid_amount > total_amount` | Blue |

### Payment Methods
- Cash
- UPI
- Bank Transfer
- Cheque
- Razorpay (online)
- Other

#### TC-7.1: View Payments Overview
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/payments` | Payment overview loads |
| 2 | Summary cards show | Total Receivable, Total Received, Outstanding, Fully Paid count |
| 3 | Verify totals | Numbers match sum of all bookings |

#### TC-7.2: Filter by Payment Status
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "All" tab | All bookings shown |
| 2 | Click "Pending" tab | Only unpaid bookings |
| 3 | Click "Partial" tab | Only partially paid bookings |
| 4 | Click "Paid" tab | Only fully paid bookings |

#### TC-7.3: Record Manual Payment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From booking detail, click "Record Payment" | Payment modal opens |
| 2 | Enter amount: 10000 (₹10,000) | Accepted |
| 3 | Select method: "UPI" | Selected |
| 4 | Enter date | Date picker |
| 5 | Enter notes (optional) | Accepted |
| 6 | Click "Save" | Payment recorded |
| 7 | Receipt number auto-generated | Format: `RCP-2026-0001` |
| 8 | Booking paid_amount updated | Balance recalculated |
| 9 | Payment status changes | e.g., PENDING → PARTIAL |
| 10 | WhatsApp notification | Sent to photographer (if enabled) |

#### TC-7.4: Send Payment Link (Razorpay)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Send Payment Link" | Modal opens |
| 2 | Enter amount | Pre-filled with balance |
| 3 | Click "Generate Link" | Razorpay payment link created |
| 4 | Link sent via WhatsApp to client | Client receives payment link message |
| 5 | Client completes payment | Webhook triggers, payment recorded automatically |

#### TC-7.5: Receipt Number Format
| Scenario | Expected Format |
|----------|----------------|
| First payment of 2026 | `RCP-2026-0001` |
| Second payment | `RCP-2026-0002` |
| New year | `RCP-2027-0001` (resets) |

#### TC-7.6: Payment Amounts
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record payment > balance | Creates OVERPAID status |
| 2 | Record ₹0 payment | Validation error |
| 3 | Record negative amount | Validation error |

---

## Module 8: Agreements

### Routes: `/bookings/[bookingId]/agreement`, `/agreement/[agreementId]`

### What It Does
Generates service agreements for bookings. Agreements contain a snapshot of all booking details at the time of generation, include the photographer's cancellation policy, and can be viewed/downloaded as PDF by clients.

### Agreement Reference Format
`AGR-2026-{STUDIO_CODE}-0001` (auto-incremented per studio per year)

#### TC-8.1: Generate Agreement
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From booking detail, click "Generate Agreement" | Agreement creation triggered |
| 2 | Wait for generation | Agreement created with snapshot data |
| 3 | Agreement appears in booking detail | Link to view agreement |
| 4 | Reference number assigned | Format: `AGR-2026-STU-0001` |

#### TC-8.2: Agreement Snapshot Content
| Field | Source |
|-------|--------|
| Studio name, address, city, GSTIN | Studio profile |
| Client name, phone, email | Client record |
| Booking ref, event type, date, venue | Booking data |
| Package name, inclusions | Selected package |
| Total amount, advance paid, balance | Payment data (in paise) |
| Cancellation policy | Custom or default |

#### TC-8.3: View Agreement (Public Link)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open agreement link: `/agreement/[agreementId]` | Agreement page loads (no login required) |
| 2 | See all agreement details | HTML rendered from snapshot |
| 3 | "PIXOVA" branding header | Shown at top |
| 4 | `client_viewed_at` timestamp updated | Records when client first views |

#### TC-8.4: Download Agreement PDF
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Download PDF" button | PDF generated and downloaded |
| 2 | PDF contains | All agreement details, formatted |
| 3 | File name | Contains agreement reference |

#### TC-8.5: Send Agreement to Client
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate agreement | Agreement created |
| 2 | WhatsApp notification sent | Client receives link to view agreement |
| 3 | Template: `pixova_agreement_ready` | Contains booking ref and download link |

### Default Cancellation Policy
> "Advance payment is non-refundable upon cancellation. Cancellations made 30 or more days before the event date will forfeit the advance payment only. Cancellations within 30 days of the event date will be charged the full booking amount. In exceptional circumstances, please contact us directly."

---

## Module 9: Client Portal

### Routes: `/portal/[portalToken]/*`

### What It Does
A dedicated portal for clients to view their booking status, gallery, agreement, payment history, send messages, and submit feedback. Access is token-based (link shared by photographer).

### Portal Sub-Pages
| Route | Page | Purpose |
|-------|------|---------|
| `/portal/[token]` | Entry | Validates token, sets session |
| `/portal/[token]/overview` | Overview | Booking status, timeline, summary |
| `/portal/[token]/gallery` | Gallery | View photos shared by photographer |
| `/portal/[token]/agreement` | Agreement | View service agreement |
| `/portal/[token]/payments` | Payments | Payment history & active links |
| `/portal/[token]/messages` | Messages | Send messages to photographer |
| `/portal/[token]/feedback` | Feedback | Submit rating & review |

#### TC-9.1: Portal Access — Valid Token
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Client clicks portal link | Portal entry page loads |
| 2 | Token validated | Loading spinner → success |
| 3 | `pixova_client_session` cookie set | Session created |
| 4 | Redirected to `/portal/[token]/overview` | Overview page loads |

#### TC-9.2: Portal Access — Invalid/Expired Token
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Visit portal with wrong token | Error: "Invalid Link" |
| 2 | Message | "Please contact your photographer for a new link" |

#### TC-9.3: Portal Overview
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Check booking status | Shows current status with badge |
| 2 | Check timeline | Visual timeline of booking lifecycle |
| 3 | Check deliverables | List of what's included |
| 4 | Navigation tabs | Gallery, Agreement, Payments, Messages, Feedback |

#### TC-9.4: Portal — View Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to gallery tab | Photos grid loads |
| 2 | Click photo | Opens in lightbox |
| 3 | If PIN enabled | PIN entry screen shown first |
| 4 | If downloads enabled | Download button visible |
| 5 | Mark photo as favorite | Heart icon toggles on/off |
| 6 | Select photos (if selection enabled) | Checkbox on each photo |
| 7 | Check selection limit | e.g., "15 of 50 selected" shown |
| 8 | Try selecting beyond limit | Error: "Selection limit reached" |
| 9 | Bulk download selected | ZIP generated with selected photos |

#### TC-9.5: Portal — View Agreement
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to agreement tab | Agreement content loads |
| 2 | See all terms | Full agreement displayed |
| 3 | Download PDF option | PDF download works |

#### TC-9.6: Portal — Payment History
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to payments tab | Payment history list |
| 2 | See each payment | Amount, method, date, receipt number |
| 3 | Active payment link | If available, "Pay Now" button |

#### TC-9.7: Portal — Send Message
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to messages tab | Message input area |
| 2 | Type message | Text input works |
| 3 | Click "Send" | Message sent, appears in list |
| 4 | Photographer sees message | In `/messages` page with unread badge |

#### TC-9.8: Portal — Submit Feedback
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to feedback tab | Rating & review form |
| 2 | Select star rating (1-5) | Stars selectable |
| 3 | Write review text | Text area |
| 4 | Toggle "public" flag | Can make review public/private |
| 5 | Submit | Feedback saved, appears in photographer's `/reviews` |

---

## Module 10: Messages

### Route: `/messages`

### What It Does
Inbox for client messages sent through the portal. Shows unread count badge in sidebar.

#### TC-10.1: View Messages
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/messages` | Message list loads |
| 2 | Unread messages highlighted | Bold/different styling |
| 3 | Each message shows | Client name, preview, timestamp ("5m ago") |
| 4 | Empty state | "No client messages yet" |

#### TC-10.2: Read Message
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click a message | Full message content shown |
| 2 | Message marked as read | Unread badge decrements |
| 3 | Link to related booking | Can navigate to booking detail |

#### TC-10.3: Unread Badge in Sidebar
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | When unread messages exist | Red badge number on "Messages" nav item |
| 2 | After reading all | Badge disappears |

---

## Module 11: Reviews & Feedback

### Route: `/reviews`

### What It Does
Shows all client reviews/ratings with aggregate statistics. Photographers can reply to feedback.

#### TC-11.1: View Reviews Summary
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/reviews` | Reviews page loads |
| 2 | Total reviews count | Number shown |
| 3 | Average rating | e.g., "4.5/5" |
| 4 | Star breakdown | Bar chart showing count for each star (1-5) |

#### TC-11.2: View Individual Review
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | See review list | Client name, event type, star rating, review text |
| 2 | Public reviews marked | "Public" badge shown |
| 3 | Private reviews | No badge, only visible to photographer |

#### TC-11.3: Reply to Review
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter reply text in input field | Text accepted |
| 2 | Click "Reply" | Reply saved with timestamp |
| 3 | Reply shown under review | With `replied_at` date |

---

## Module 12: Settings

### Routes: `/settings`, `/settings/subscription`, `/settings/notifications`, `/settings/cancellation-policy`

### What It Does
Hub for photographer account settings: subscription management, notification preferences, and cancellation policy.

### Sub-Pages

#### 12A: Settings Main (`/settings`)
| Element | Action |
|---------|--------|
| Studio Profile | Coming soon |
| Subscription | Link to `/settings/subscription` |
| Cancellation Policy | Link to `/settings/cancellation-policy` |
| WhatsApp Notifications | Link to `/settings/notifications` |

#### TC-12.1: Subscription Management (`/settings/subscription`)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to subscription page | Current plan highlighted |
| 2 | See 3 plans displayed | Starter (₹999), Professional (₹1,999), Studio (₹4,999) |
| 3 | Current plan badge | "Current Plan" indicator |
| 4 | Click "Upgrade" on higher plan | Razorpay checkout opens |
| 5 | Complete payment | Plan upgraded immediately |
| 6 | Click "Cancel Subscription" | Confirmation dialog |
| 7 | Confirm cancel | Enters grace period (15 days) |

#### Subscription Plans
| Plan | Price/month | Bookings/month | Storage |
|------|------------|----------------|---------|
| **Starter** | ₹999 | 10 | 10 GB |
| **Professional** (Popular) | ₹1,999 | 30 | 50 GB |
| **Studio** | ₹4,999 | Unlimited | 200 GB |

#### TC-12.2: Notification Preferences (`/settings/notifications`)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to notifications page | 6 toggles shown |
| 2 | Each toggle represents | A WhatsApp notification template |
| 3 | Toggle OFF "Booking Confirmed" | Disables that notification |
| 4 | Toggle ON "Payment Received" | Enables that notification |
| 5 | Adjust "Reminder Hours Before" | e.g., 24 hours before event |
| 6 | Save | Preferences stored |

| Toggle | Template | Default |
|--------|----------|---------|
| Booking Confirmed | `pixova_booking_confirmed` | ON |
| Payment Received | `pixova_payment_received` | ON |
| Agreement Ready | `pixova_agreement_ready` | ON |
| Gallery Published | `pixova_gallery_published` | ON |
| Payment Link | `pixova_payment_link` | ON |
| Event Reminder | `pixova_event_reminder` | ON |

#### TC-12.3: Notification Log
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/settings/notifications/log` | Notification history shown |
| 2 | Each entry shows | Template name, recipient, status (SENT/FAILED), timestamp |

#### TC-12.4: Cancellation Policy (`/settings/cancellation-policy`)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to cancellation policy page | Text area with current policy |
| 2 | Default policy pre-filled | Standard cancellation terms shown |
| 3 | Edit text (max 2000 chars) | Changes tracked |
| 4 | Click "Save" | Toast: "Policy saved successfully" |
| 5 | Policy used in new agreements | Snapshot includes custom policy |

---

## Module 13: Admin Panel

### Routes: `/admin/login`, `/admin/dashboard`, `/admin/photographers`, `/admin/photographers/[id]`, `/admin/revenue`

### What It Does
Internal admin panel for Pixova team to manage photographers, monitor revenue, and handle account actions (suspend, upgrade, extend trial).

### Admin Navigation
- **Dashboard** — Revenue metrics & activity
- **Photographers** — User management
- **Revenue** — Financial analytics
- **Logout** — End admin session

#### TC-13.1: Admin Login
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/login` | Login form with email + password |
| 2 | Enter email: `admin@pixova.in` | Pre-filled |
| 3 | Enter password | Password field |
| 4 | Click "Sign In" | Loading → Success |
| 5 | Redirected to `/admin/dashboard` | Dashboard loads |
| 6 | Cookie set | `pixova_admin_session` (8-hour expiry, httpOnly) |

#### TC-13.2: Admin Login — Wrong Credentials
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter wrong password | Error: "Invalid email or password" |
| 2 | Try 5 times in 15 min | Rate limit may apply |

#### TC-13.3: Admin Dashboard
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View MRR | Monthly Recurring Revenue in ₹ |
| 2 | View ARR | Annual Recurring Revenue (MRR × 12) |
| 3 | Active subscribers count | Number of paying users |
| 4 | Trial users count | Number of trial users |
| 5 | Grace period users count | Users in grace period |
| 6 | Plan breakdown | Bar chart: TRIAL, STARTER, PROFESSIONAL, STUDIO counts |
| 7 | Recent activity | Plan upgrades/downgrades with dates |

#### TC-13.4: Photographer List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/photographers` | Paginated table of all photographers |
| 2 | Columns | Name/Studio, Plan, Status, Bookings, Storage (GB), Joined date |
| 3 | Search by name or phone | Real-time filter |
| 4 | Filter by Plan dropdown | TRIAL, STARTER, PROFESSIONAL, STUDIO |
| 5 | Filter by Status dropdown | ACTIVE, TRIAL, GRACE, EXPIRED, SUSPENDED |
| 6 | Pagination | 20 per page, Prev/Next buttons |
| 7 | Total count shown | "{N} total" |

#### TC-13.5: Photographer Detail
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "View →" on photographer | Detail page loads |
| 2 | Header shows | Full name, phone, studio name |
| 3 | Subscription section | Plan, Status, Bookings used, Period end, Grace end, Storage |
| 4 | Subscription events | Timeline of plan changes |
| 5 | Recent bookings | Last bookings with ref, status, date, amount |

#### TC-13.6: Change Plan (Admin Action)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Change Plan" button | Modal with plan dropdown |
| 2 | Select new plan (e.g., PROFESSIONAL → STUDIO) | Selected |
| 3 | Enter notes (optional) | Text field |
| 4 | Click "Apply" | Plan updated immediately |
| 5 | Subscription event logged | `PLAN_CHANGED_BY_ADMIN` event |
| 6 | Photographer sees new plan | On their dashboard/settings |

#### TC-13.7: Suspend Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Suspend" button | Modal with reason field |
| 2 | Enter reason (required) | Text accepted |
| 3 | Click "Suspend" | Account suspended |
| 4 | Photographer redirected | To `/suspended` page on next visit |
| 5 | Status badge | Shows "SUSPENDED" in red |
| 6 | Cannot submit without reason | Button disabled if empty |

#### TC-13.8: Unsuspend Account
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On suspended photographer, click "Unsuspend" | Confirmation |
| 2 | Account reactivated | Status returns to previous |
| 3 | Photographer can login again | Normal access restored |

#### TC-13.9: Extend Trial
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Extend Trial" | Modal with days input |
| 2 | Enter days (1-30) | Number accepted |
| 3 | Click "Extend" | Trial extended by N days |
| 4 | Trial end date updated | New expiry reflects extension |

#### TC-13.10: Revenue Page
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/revenue` | Full revenue analytics |
| 2 | Revenue grid | Total Revenue, MRR, ARR, Active Subs, Trial, Grace |
| 3 | Plan breakdown | 4-column grid with counts |
| 4 | Revenue by month chart | Bar chart for last 6 months |
| 5 | Each month shows | Revenue amount + new subscriptions count |

#### TC-13.11: Admin Logout
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Logout" in sidebar | API call to `DELETE /api/v1/admin/auth/login` |
| 2 | Cookie cleared | `pixova_admin_session` deleted |
| 3 | Redirected to `/admin/login` | Login page shown |

#### TC-13.12: Admin Session Expiry
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Wait 8 hours after login | Session expires |
| 2 | Try navigating to any admin page | Redirected to `/admin/login` |
| 3 | Cookie auto-cleared | Invalid token removed |

---

## Module 14: WhatsApp Notifications

### What It Does
Sends transactional WhatsApp messages using Meta Cloud API (v19.0). Notifications are sent at key business events.

### Notification Templates

| Template | Trigger | Recipient | Parameters |
|----------|---------|-----------|------------|
| `pixova_otp` | Login OTP requested | Photographer | OTP code |
| `pixova_booking_confirmed` | Booking confirmed | Photographer + Client | Client name, Event type, Date, Amount, Booking ref, Studio name |
| `pixova_payment_received` | Payment recorded | Photographer | Client name, Amount, Balance, Receipt #, Booking ref |
| `pixova_agreement_ready` | Agreement generated | Client | Studio name, Booking ref, Agreement link |
| `pixova_gallery_published` | Gallery published | Client | Studio name, Client name, Gallery link, Photo count |
| `pixova_payment_link` | Payment link sent | Client | Studio name, Client name, Amount, Payment link, Booking ref, Due date |
| `pixova_event_reminder` | 1 day before event | Photographer + Client | Studio name, Client name, Event type, Date, Venue, Time |

#### TC-14.1: OTP Notification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request OTP from login page | WhatsApp message received |
| 2 | Message contains | 6-digit OTP code |
| 3 | Message from | Pixova sender number (+91 63696 87944) |

#### TC-14.2: Booking Confirmation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Confirm a booking | WhatsApp sent to BOTH photographer AND client |
| 2 | Message contains | Client name, event type, date, amount |
| 3 | If notification disabled in settings | NO message sent |

#### TC-14.3: Payment Received
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Record a payment | WhatsApp sent to photographer |
| 2 | Message contains | Client name, amount paid, balance, receipt number |

#### TC-14.4: Agreement Ready
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate agreement | WhatsApp sent to client |
| 2 | Message contains | Booking ref, agreement view link |

#### TC-14.5: Gallery Published
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Publish gallery | WhatsApp sent to client |
| 2 | Message contains | Gallery link, expiry info |

#### TC-14.6: Payment Link
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send payment link | WhatsApp sent to client |
| 2 | Message contains | Amount, Razorpay link |

#### TC-14.7: Event Reminder
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | 1 day before event date | Auto-sent by cron job |
| 2 | Message sent to | Both photographer and client |
| 3 | Message contains | Event date, type, venue |

#### TC-14.8: Notification Preference Respected
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disable "Booking Confirmed" in settings | Toggle OFF |
| 2 | Confirm a booking | NO WhatsApp sent |
| 3 | Re-enable toggle | Next confirmation sends WhatsApp |

---

## Module 17: Cron Jobs (Scheduled Tasks)

### What It Does
Automated tasks that run on a schedule via Vercel Cron.

### Cron Schedule
| Job | Route | Schedule | Purpose |
|-----|-------|----------|----------|
| Event Reminders | `/api/v1/cron/send-reminders` | Daily at 3:00 AM UTC (8:30 AM IST) | Sends WhatsApp reminders for events happening the next day |

#### TC-17.1: Event Reminder Cron
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Booking exists with event_date = tomorrow | Cron identifies it |
| 2 | Cron runs at 8:30 AM IST | Auto-triggered by Vercel |
| 3 | WhatsApp sent to photographer | Contains event details |
| 4 | WhatsApp sent to client | Contains event details |
| 5 | If notification disabled | No message sent |
| 6 | Already-sent reminders | Not sent again (dedup logic) |

---

## Module 18: Session Management

### What It Does
Photographers can view and manage their active login sessions across devices.

### API Routes
| Method | Endpoint | Purpose |
|--------|----------|----------|
| GET | `/api/v1/auth/sessions` | List all active sessions |
| DELETE | `/api/v1/auth/sessions/[sessionId]` | Logout from specific device |

#### TC-18.1: View Active Sessions
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Navigate to settings or profile | Sessions list shown |
| 2 | Each session shows | Device/browser, IP, last used, created date |
| 3 | Current session highlighted | Marked as "This device" |

#### TC-18.2: Logout from Other Device
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Click "Logout" on another session | Session deleted |
| 2 | That device's session | Becomes invalid, redirected to login |
| 3 | Current session | Unaffected |

---

## Module 19: Studio Public Profile & Calendar

### What It Does
Studios have a public-facing availability calendar accessible without login.

### API Route
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|----------|
| GET | `/api/v1/calendar/[studioSlug]` | None | Public availability for a studio |
| GET | `/api/v1/calendar/check` | None | Check specific date availability |

#### TC-19.1: Public Availability Check
| Step | Action | Expected Result |
|------|--------|------------------|
| 1 | Client checks photographer's availability | Available/blocked dates shown |
| 2 | Booked dates | Shown as unavailable |
| 3 | Blocked dates | Shown as unavailable |
| 4 | Free dates | Shown as available |
| 5 | No booking details exposed | Only available/unavailable status |

---

## Module 15: Public Pages

### Routes: `/terms`, `/privacy`

#### TC-15.1: Terms of Service
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/terms` | Full terms of service page loads |
| 2 | No login required | Public access |
| 3 | Content includes | 11 sections covering all legal terms |
| 4 | Company info | ZYARTH.ai, Chennai, India |

#### TC-15.2: Privacy Policy
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/privacy` | Full privacy policy page loads |
| 2 | No login required | Public access |
| 3 | Content includes | Data collection, WhatsApp usage, GDPR compliance |
| 4 | Data providers mentioned | Supabase, Cloudflare R2, Razorpay, Meta WhatsApp, Vercel |

---

## Module 16: Public Gallery Sharing

### Route: `/g/[slug]`

### What It Does
Public gallery page accessible to anyone with the link. No login required. Optional PIN protection.

#### TC-16.1: View Public Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gallery link: `pixova.in/g/studio-sunshine-abc123` | Gallery page loads |
| 2 | Photo grid displayed | All published photos in grid layout |
| 3 | Click photo | Lightbox opens with full-size image |
| 4 | Navigate in lightbox | Left/right arrows, keyboard arrows |
| 5 | Close lightbox | Returns to grid |

#### TC-16.2: PIN-Protected Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open PIN-protected gallery link | PIN entry screen shown |
| 2 | Enter correct PIN | Gallery loads |
| 3 | Enter wrong PIN | Error: "Incorrect PIN" (403) |

#### TC-16.3: Gallery with Downloads Enabled
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gallery with downloads on | Download buttons visible |
| 2 | Select individual photo | Download button for single photo |
| 3 | Select multiple (up to limit) | "Download Selected" button |
| 4 | Click download | ZIP file generated and downloaded |

#### TC-16.4: Gallery with Downloads Disabled
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gallery with downloads off | No download buttons visible |
| 2 | Right-click photo | Context menu blocked or no save option |

#### TC-16.5: Expired Gallery
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gallery past expiry date | Error page: "Gallery expired" (410) |

#### TC-16.6: Gallery Not Found
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open invalid gallery slug | Error: "Gallery not found" (404) |

---

## Subscription Plans & Limits

| Feature | Starter (₹999/mo) | Professional (₹1,999/mo) | Studio (₹4,999/mo) |
|---------|:------------------:|:--------------:|:-------------------:|
| Bookings/month | 10 | 30 | Unlimited |
| Storage | 10 GB | 50 GB | 200 GB |
| Galleries | 20 | 100 | Unlimited |
| Photos/gallery | 500 | 2,000 | Unlimited |
| Watermark | ✅ | ✅ | ✅ |
| Client selections | ✅ | ✅ | ✅ |
| Downloads | ✅ | ✅ | ✅ |

### Subscription Lifecycle
```
New User → TRIAL (14-30 days free)
         ↓
       Subscribe → ACTIVE (paid plan)
         ↓
       Period ends → GRACE (15 days to renew)
         ↓ (if not renewed)
       EXPIRED → Access restricted → SUSPENDED (admin action)
         ↓
       Renew → ACTIVE (restored)
```

---

## Business Rules & Validation Rules

### Phone Number
- Must be 10 digits (Indian mobile)
- Must start with 6, 7, 8, or 9
- Optional +91 prefix accepted
- Regex: `^(\+91)?[6-9]\d{9}$`

### OTP
- Length: 6 digits
- Expiry: 10 minutes
- Max attempts: 3 per OTP session
- Rate limit: 5 OTPs per phone per hour
- Resend cooldown: 30 seconds

### Studio Slug
- Minimum 3 characters
- Maximum 50 characters
- Only lowercase letters, numbers, and hyphens
- Must be globally unique
- Regex: `^[a-z0-9-]+$`

### Booking Amounts
- Stored in paise (₹1 = 100 paise)
- Display: Formatted as ₹XX,XXX (Indian locale)

### Photos
- Max size: 25 MB per file
- Formats: JPEG, PNG, WebP, HEIC, HEIF
- Thumbnails: Auto-generated at 320px, 640px, 1280px, 1920px

### Agreements
- Reference: `AGR-YYYY-{CODE}-####`
- Auto-incremented per studio per year

### Receipts
- Reference: `RCP-YYYY-####`
- Auto-incremented per photographer per year

### Session Cookies
| Cookie | Expiry | HttpOnly | Secure |
|--------|--------|----------|--------|
| `pixova_session` | 7 days | Yes | Yes (prod) |
| `pixova_admin_session` | 8 hours | Yes | Yes (prod) |
| `pixova_client_session` | 30 days | Yes | Yes (prod) |

---

## Error Codes Reference

| HTTP Code | Meaning | When It Occurs |
|-----------|---------|----------------|
| 200 | Success | Normal response |
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | No auth token, expired session |
| 403 | Forbidden | Wrong PIN, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 410 | Gone | Gallery expired |
| 429 | Too Many Requests | OTP rate limit, login rate limit |
| 500 | Server Error | Unexpected backend error |

---

## Complete API Reference

### Authentication
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/auth/send-otp` | None | Send OTP via WhatsApp |
| POST | `/api/v1/auth/verify-otp` | None | Verify OTP, get session |
| POST | `/api/v1/auth/logout` | JWT | Logout, clear cookies |
| GET | `/api/v1/auth/check-slug` | JWT | Check slug availability |
| GET | `/api/v1/auth/callback` | Token | Exchange token for session |
| GET | `/api/v1/auth/sessions` | JWT | List active sessions |
| DELETE | `/api/v1/auth/sessions/[sessionId]` | JWT | Revoke specific session |

### Dashboard
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/dashboard` | JWT | Dashboard data |

### Bookings
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/bookings` | JWT | List bookings (paginated) |
| POST | `/api/v1/bookings` | JWT | Create booking |
| GET | `/api/v1/bookings/[id]` | JWT | Get booking detail |
| PATCH | `/api/v1/bookings/[id]` | JWT | Update booking |
| DELETE | `/api/v1/bookings/[id]` | JWT | Cancel booking |
| GET | `/api/v1/bookings/summary` | JWT | Booking summary stats |
| GET | `/api/v1/bookings/[id]/payments` | JWT | Payment history |
| POST | `/api/v1/bookings/[id]/payments` | JWT | Record payment |

### Calendar
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/calendar` | JWT | Get month blocks |
| POST | `/api/v1/calendar/block` | JWT | Create block |
| DELETE | `/api/v1/calendar/block/[id]` | JWT | Remove block |
| GET | `/api/v1/calendar/check` | None | Check date availability |
| GET | `/api/v1/calendar/[studioSlug]` | None | Public studio calendar |

### Galleries
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/galleries` | JWT | List all galleries |
| GET | `/api/v1/galleries/[bookingId]` | JWT | Get gallery for booking |
| POST | `/api/v1/galleries/[bookingId]/init` | JWT | Initialize empty gallery |
| GET | `/api/v1/galleries/[bookingId]/photos` | JWT | List gallery photos |
| DELETE | `/api/v1/galleries/[bookingId]/photos/[photoId]` | JWT | Delete photo |
| POST | `/api/v1/galleries/[bookingId]/upload-url` | JWT | Get presigned upload URL |
| POST | `/api/v1/galleries/[bookingId]/confirm-upload` | JWT | Confirm photo upload |
| GET | `/api/v1/galleries/[bookingId]/download-urls` | JWT | Get download URLs |
| GET | `/api/v1/galleries/[bookingId]/selection` | JWT | Client photo selections |
| PATCH | `/api/v1/galleries/[bookingId]/selection` | JWT | Lock/unlock client selection |
| PATCH | `/api/v1/galleries/[bookingId]/photos/[photoId]` | JWT | Update photo visibility |
| GET | `/api/v1/galleries/storage` | JWT | Storage usage |
| GET | `/api/v1/gallery/[slug]` | None* | Public gallery (+ optional PIN) |
| POST | `/api/v1/gallery/publish/[id]` | JWT | Publish gallery |
| POST | `/api/v1/gallery/protect` | JWT | Set PIN |
| POST | `/api/v1/gallery/unprotect` | JWT | Remove PIN |

### Gallery Photos
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/gallery-photos` | JWT | Upload photo |
| DELETE | `/api/v1/gallery-photos/[id]` | JWT | Delete photo |

### Agreements
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/agreements` | JWT | List agreements |
| POST | `/api/v1/agreements` | JWT | Create agreement |
| GET | `/api/v1/agreements/[id]` | None* | View agreement |
| PATCH | `/api/v1/agreements/[id]` | None* | Mark viewed |
| GET | `/api/v1/agreements/[id]/pdf` | None* | Download PDF |
| POST | `/api/v1/agreements/generate/[bookingId]` | JWT | Generate from booking |

### Payments
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/payments` | JWT | List payments |
| POST | `/api/v1/payments` | JWT | Record payment |
| GET | `/api/v1/payments/summary` | JWT | Payment summary |
| POST | `/api/v1/payments/create-order` | JWT | Create Razorpay order |
| POST | `/api/v1/payments/verify` | JWT | Verify Razorpay payment |
| GET | `/api/v1/payments/[bookingId]` | JWT | Get payments for booking |
| POST | `/api/v1/payments/[bookingId]` | JWT | Record payment for booking |
| PATCH | `/api/v1/payments/[bookingId]/[paymentId]` | JWT | Update payment record |
| DELETE | `/api/v1/payments/[bookingId]/[paymentId]` | JWT | Delete payment record |
| POST | `/api/v1/payments/[bookingId]/payment-link` | JWT | Create & send payment link |

### Subscriptions
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/subscription` | JWT | Current subscription |
| POST | `/api/v1/subscription/upgrade` | JWT | Upgrade plan |
| POST | `/api/v1/subscription/cancel` | JWT | Cancel subscription |
| GET | `/api/v1/subscription/invoices` | JWT | List subscription invoices |

### Packages
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/packages` | JWT | List packages |
| POST | `/api/v1/packages` | JWT | Create package |
| PATCH | `/api/v1/packages/[id]` | JWT | Update package |
| DELETE | `/api/v1/packages/[id]` | JWT | Delete package |

### Messages
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/messages/unread` | JWT | List unread messages |
| PATCH | `/api/v1/messages/[messageId]/read` | JWT | Mark message as read |

### Notifications
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/notifications/preferences` | JWT | Get preferences |
| PATCH | `/api/v1/notifications/preferences` | JWT | Update preferences |
| GET | `/api/v1/notifications/log` | JWT | Notification history |
| POST | `/api/v1/notifications/send` | JWT | Send notification |

### Feedback
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/feedback/summary` | JWT | Reviews summary |
| POST | `/api/v1/bookings/[id]/feedback` | JWT | Submit feedback for booking |
| POST | `/api/v1/bookings/[id]/feedback/reply` | JWT | Reply to feedback |

### Client Portal
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/portal/[token]` | Token | Validate portal access |
| GET | `/api/v1/portal/me/gallery` | Session | Client gallery access |
| GET | `/api/v1/portal/me/gallery/selection` | Session | Photo selection data |
| POST | `/api/v1/portal/me/gallery/photos/[photoId]/favourite` | Session | Toggle photo favorite |
| GET | `/api/v1/portal/me/gallery/download-urls` | Session | Get download URLs |
| GET | `/api/v1/portal/me/payments` | Session | Payment history |
| GET/POST | `/api/v1/portal/me/feedback` | Session | Get/submit feedback |
| PATCH | `/api/v1/portal/me/feedback/[feedbackId]` | Session | Update feedback |
| POST | `/api/v1/portal/me/messages` | Session | Send message to photographer |
| GET | `/api/v1/portal/me/agreement` | Session | View agreement |
| POST | `/api/v1/portal/[token]/request-feedback` | Token | Request client feedback |

### Admin
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/admin/auth/login` | None | Admin login |
| DELETE | `/api/v1/admin/auth/login` | Admin | Admin logout |
| GET | `/api/v1/admin/photographers` | Admin | List photographers |
| GET | `/api/v1/admin/photographers/[id]` | Admin | Photographer detail |
| PATCH | `/api/v1/admin/photographers/[id]/plan` | Admin | Change plan |
| PATCH | `/api/v1/admin/photographers/[id]/suspend` | Admin | Suspend |
| PATCH | `/api/v1/admin/photographers/[id]/unsuspend` | Admin | Unsuspend |
| POST | `/api/v1/admin/photographers/[id]/extend-trial` | Admin | Extend trial |
| GET | `/api/v1/admin/revenue` | Admin | Revenue stats |

### Onboarding
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/onboarding` | JWT | Save studio profile |

### Webhooks
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/webhooks/razorpay` | Signature | Payment confirmations |
| POST | `/api/v1/webhooks/meta-whatsapp` | Verify | Delivery status updates |

### Cron Jobs
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/cron/send-reminders` | Vercel Cron | Send event reminder notifications |

### Other
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/v1/health` | None | Health check |
| POST | `/api/v1/upload` | JWT | Generic file upload |
| POST | `/api/v1/upload/presigned-url` | JWT | Get presigned URL for direct upload |
| GET | `/api/v1/cancellation-policy` | JWT | Get policy text |
| PATCH | `/api/v1/cancellation-policy` | JWT | Update policy text |

---

## End-to-End Test Flows

### Flow 1: New Photographer Signup → First Booking → Gallery Delivery

```
1. Open pixova.in/login
2. Enter phone → Receive OTP on WhatsApp → Verify
3. Redirected to /onboarding
4. Fill studio name, slug, city, phone → Next
5. Create 1 package (e.g., "Wedding Basic" ₹25,000) → Next
6. Review → Click "Go Live"
7. Land on /dashboard
8. Click "New Booking" → Fill client details, select package → Create
9. Booking appears in /bookings list
10. Calendar shows event date blocked
11. Confirm booking → WhatsApp sent to client
12. Record advance payment (₹10,000 UPI) → Receipt generated
13. Navigate to /galleries → Create gallery for booking
14. Upload 20 photos
15. Enable downloads, set PIN
16. Publish gallery → Client receives WhatsApp with link
17. Generate agreement → Client receives WhatsApp with agreement link
18. Client opens gallery link → Enters PIN → Views photos → Downloads
19. Client opens agreement link → Views → Downloads PDF
20. Client submits 5-star feedback via portal
21. Photographer sees feedback in /reviews
22. Photographer replies to review
```

### Flow 2: Admin Manages Photographer

```
1. Open pixova.in/admin/login
2. Enter admin credentials → Login
3. Navigate to Photographers
4. Search for photographer by phone
5. Click "View →" → See full details
6. Change plan from TRIAL to PROFESSIONAL
7. See subscription event logged
8. Extend trial by 15 days
9. Suspend account with reason "Policy violation"
10. Verify photographer redirected to /suspended
11. Unsuspend account
12. Verify photographer can access dashboard again
13. Check Revenue page → Verify MRR/ARR updated
14. Logout
```

### Flow 3: Client Portal Journey

```
1. Photographer shares portal link with client via WhatsApp
2. Client clicks link → Portal entry page → Validated → Overview loads
3. Client views booking status and timeline
4. Client navigates to Gallery tab → Views photos
5. Client navigates to Agreement tab → Views & downloads PDF
6. Client navigates to Payments tab → Sees payment history
7. Client clicks "Pay Now" → Razorpay checkout → Completes payment
8. Webhook triggers → Payment auto-recorded
9. Client navigates to Messages → Sends "Thank you!" message
10. Photographer sees message with unread badge in /messages
11. Photographer reads message → Badge clears
12. Client navigates to Feedback → Gives 5 stars + review
13. Photographer sees review in /reviews → Replies
```

### Flow 4: Subscription Lifecycle

```
1. New photographer signs up → Gets TRIAL (14 days)
2. Trial expires → Grace period starts (15 days)
3. Grace banner appears on dashboard
4. Photographer navigates to /settings/subscription
5. Selects "Professional" plan → Razorpay checkout
6. Payment confirmed → Plan active
7. 30 days later → Subscription renewal (auto or manual)
8. If not renewed → Grace period → Expired → Suspended
9. Admin can extend trial, change plan, or unsuspend
```

---

## UI/UX Checklist

### Responsive Design
- [ ] All pages work on mobile (320px width)
- [ ] All pages work on tablet (768px width)
- [ ] All pages work on desktop (1440px width)
- [ ] Mobile hamburger menu opens/closes
- [ ] Tables scroll horizontally on mobile

### Theme
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Theme toggle works (via floating button on non-photographer pages)
- [ ] Theme persists across page navigations

### Localization (i18n)
- [ ] English (en) — default
- [ ] Tamil (ta)
- [ ] Hindi (hi)
- [ ] Malayalam (ml)
- [ ] Locale persists across navigations
- [ ] All UI text translates (check: dashboard, bookings, payments, settings)

### Loading States
- [ ] Skeleton loaders on data-heavy pages
- [ ] Spinners on button actions
- [ ] Loading.tsx pages work (bookings, galleries, settings)

### Empty States
- [ ] No bookings → "Create your first booking" CTA
- [ ] No galleries → "Create your first gallery" CTA
- [ ] No messages → "No messages yet" placeholder
- [ ] No reviews → "No reviews yet" placeholder
- [ ] No payments → "No payments yet" placeholder

### Toast Notifications
- [ ] Success actions show green toast
- [ ] Error actions show red toast
- [ ] Toast auto-dismisses after a few seconds

### Navigation
- [ ] Sidebar highlights active route
- [ ] Back button works from detail pages
- [ ] Browser back/forward works correctly
- [ ] Deep links work (direct URL access)

---

> **End of QA Testing Guide**  
> For questions, contact the development team.
