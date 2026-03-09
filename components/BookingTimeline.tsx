// ============================================
// BookingTimeline — Visual status progression
// Numbered step indicator with progress bar
// ============================================

"use client";

const STEPS = [
  { key: "enquiry", label: "Enquiry" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

interface BookingTimelineProps {
  currentStatus: string;
}

export function BookingTimeline({ currentStatus }: BookingTimelineProps) {
  const isCancelled = currentStatus === "cancelled";
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
          <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Booking Cancelled</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70">This booking is no longer active</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""}`}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50"
                    : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1.5 whitespace-nowrap text-[10px] font-medium ${
                  isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : isCurrent
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded ${
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                    ? "bg-brand-300 dark:bg-brand-700"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
