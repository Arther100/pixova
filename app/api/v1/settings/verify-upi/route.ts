// ============================================
// POST /api/v1/settings/verify-upi
// Verifies a UPI VPA using Razorpay's validation API.
// Falls back to format-only validation when using test keys
// (Razorpay VPA endpoint only works with live keys).
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

// Valid UPI handle suffixes (major Indian banks + PSPs)
const KNOWN_HANDLES = [
  "oksbi","okaxis","okicici","okhdfcbank","ybl","paytm","axl","ibl",
  "upi","rbl","fbl","kotak","apl","jupiteraxis","fi","federal","sbi",
  "cnrb","kvb","cub","tmb","dbs","hsbc","citibank","aubank","airtel",
  "barodampay","mahb","ubi","pnb","idbi","unionbank","indianbank",
  "indus","idfc","equitas","esaf","utib","icici","hdfc","axis",
];

function isValidUpiFormat(vpa: string): boolean {
  const parts = vpa.split("@");
  if (parts.length !== 2) return false;
  const [user, handle] = parts;
  if (!user || user.length < 2 || user.length > 256) return false;
  if (!/^[a-zA-Z0-9.\-_]+$/.test(user)) return false;
  if (!handle || handle.length < 2) return false;
  return true;
}

function isKnownHandle(vpa: string): boolean {
  const handle = vpa.split("@")[1]?.toLowerCase();
  return KNOWN_HANDLES.includes(handle);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const { upi_id } = body;

    if (!upi_id || typeof upi_id !== "string" || !upi_id.trim()) {
      return errorResponse("UPI ID is required");
    }

    const vpa = upi_id.trim().toLowerCase();

    // Step 1: Format check
    if (!isValidUpiFormat(vpa)) {
      return errorResponse("Invalid UPI ID format. Example: name@oksbi or 9876543210@ybl");
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const isLiveKey = keyId.startsWith("rzp_live_");

    // Step 2: Try Razorpay VPA validation (only reliable with live keys)
    if (isLiveKey && keyId && keySecret) {
      try {
        const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/payments/validate/vpa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({ vpa }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          return successResponse({
            valid: true,
            vpa: data.vpa,
            name: data.customer_name || null,
            verified_by: "razorpay",
          });
        }

        // res.ok + !data.success = VPA reached NPCI but ID not registered
        if (res.ok && !data.success) {
          return errorResponse("UPI ID not found. Please check and try again.");
        }

        // Non-2xx (404/503 etc.) = Razorpay VPA feature not available on this account
        // Fall through to format validation below
      } catch {
        // Razorpay call failed — fall through to format validation
      }
    }

    // Step 3: Format-only fallback (test keys or Razorpay unavailable)
    // Reject completely unknown/nonsense handles
    const handle = vpa.split("@")[1];
    const looksReal = isKnownHandle(vpa) || /^[a-z]{2,20}$/.test(handle);

    if (!looksReal) {
      return errorResponse(`Unknown UPI handle "@${handle}". Check your UPI ID and try again.`);
    }

    return successResponse({
      valid: true,
      vpa,
      name: null,
      // Tell the frontend this was format-only (no bank lookup)
      verified_by: "format",
    });
  } catch (err) {
    console.error("[verify-upi] error:", err);
    return serverErrorResponse();
  }
}
