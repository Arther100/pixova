import { NextRequest } from "next/server";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-helpers";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse("Missing payment verification fields");
    }

    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return errorResponse("Invalid payment signature", 400);
    }

    const supabase = createSupabaseAdmin();

    // Update payment record
    await supabase
      .from("payment_records")
      .update({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        status: "captured",
      })
      .eq("razorpay_order_id", razorpayOrderId);

    return successResponse({ verified: true });
  } catch (err) {
    console.error("[verify-payment] Unexpected error:", err);
    return serverErrorResponse();
  }
}
