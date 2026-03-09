import { successResponse } from "@/lib/api-helpers";

export async function GET() {
  return successResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
}
