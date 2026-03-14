export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-helpers";
import { createOrder } from "@/lib/razorpay";
import { uuid } from "@/utils/helpers";

export async function POST(request: NextRequest) {
  try {
    // TODO: Auth middleware
    const body = await request.json();
    const { amount, bookingId, type } = body;

    if (!amount || amount < 100) {
      return errorResponse("Amount must be at least ₹1 (100 paise)");
    }

    if (!type) {
      return errorResponse("Payment type is required");
    }

    const receipt = `pxv_${uuid().slice(0, 8)}`;

    const order = await createOrder({
      amount,
      receipt,
      notes: {
        bookingId: bookingId || "",
        type,
      },
    });

    return successResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[create-order] Unexpected error:", err);
    return serverErrorResponse();
  }
}
