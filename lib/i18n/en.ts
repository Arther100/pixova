const en = {
  // Common
  appName: "Pixova",
  loading: "Loading...",
  cancel: "Cancel",
  save: "Save",
  next: "Next",
  back: "Back",
  retry: "Retry",
  error: "Error",
  success: "Success",

  // Landing page
  landing: {
    heroTitle: "Your Studio,",
    heroHighlight: "Simplified",
    heroDescription:
      "Manage bookings, deliver photo galleries via WhatsApp, and grow your photography business — all from one dashboard.",
    getStarted: "Get Started Free",
    seeFeatures: "See Features",
    builtForIndia: "Built for Indian photographers",
    whatsappFirst: "WhatsApp-first delivery",
    razorpayPayments: "Razorpay payments",
  },

  // Login page
  login: {
    signInTitle: "Sign in with your WhatsApp number",
    enterOtp: "Enter the OTP to continue",
    phoneLabel: "Phone Number",
    phonePlaceholder: "98765 43210",
    phoneHint: "We'll send a 6-digit OTP via WhatsApp",
    sendOtp: "Send OTP via WhatsApp",
    otpSentVia: "OTP sent via",
    otpSentTo: "to",
    verifySignIn: "Verify & Sign In",
    resendOtp: "Resend OTP",
    resendOtpIn: "Resend OTP in",
    changeNumber: "← Change number",
    otpExpires: "OTP expires in",
    minutes: "minutes",
    maxAttempts: "Max 3 attempts",
    retryHint: "Enter the OTP again to retry",
    networkError: "Network error. Please try again.",
    failedToSend: "Failed to send OTP",
    verificationFailed: "Verification failed",
  },

  // Terms
  terms: {
    bySigningIn: "By signing in, you agree to our",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
  },

  // Theme
  theme: {
    light: "Light",
    dark: "Dark",
    toggle: "Toggle theme",
  },

  // Language
  language: {
    label: "Language",
    en: "English",
    ta: "தமிழ்",
    hi: "हिन्दी",
    ml: "മലയാളം",
  },

  // Onboarding
  onboarding: {
    title: "Set up your studio",
    subtitle: "Complete your profile so clients can find and book you",
    step1: "Studio Basics",
    step2: "Packages",
    step3: "Go Live",
    profileCompletion: "Profile Completion",
    profilePreview: "Profile Preview",
    makePublic: "Make profile public",
    makePublicHint: "Allow clients to find you on Pixova",
    coverPhoto: "Cover Photo",
    coverPhotoHint: "Optional — you can add this later from Settings",
    goToDashboard: "Go to Dashboard",
    backToBasics: "← Back to Studio Basics",
    updateLater: "You can update everything later from Settings",
    profileGood: "Great! Your profile is looking good. 🎉",
    profileTip: "Tip: Add a logo and cover photo from Settings to reach 100%.",
  },

  // Dashboard
  dashboard: {
    greeting: "Welcome back",
    studioOverview: "Here's what's happening at",
    setupStudio: "Set up your studio to get started",
    trialActive: "Free trial active",
    trialEnds: "Your trial ends on",
    todayBookings: "Today's Bookings",
    pendingEnquiries: "Pending Enquiries",
    notifications: "Notifications",
    bookingsUsed: "Bookings Used",
    profileCompletion: "Profile Completion",
    completeProfile: "Complete your profile to attract more clients.",
    updateProfile: "Update Profile →",
    quickActions: "Quick Actions",
    newBooking: "New Booking",
    viewCalendar: "View Calendar",
    shareProfile: "Share Profile",
    retry: "Retry",
    loadingDashboard: "Loading dashboard...",
  },
} as const;

export default en;

// Derive the shape (keys) but allow any string values
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};
export type TranslationKeys = DeepStringify<typeof en>;
