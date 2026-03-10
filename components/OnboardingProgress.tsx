// ============================================
// OnboardingProgress — Step progress indicator
// Shows 3-step wizard progress with labels
// ============================================

"use client";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
}

export function OnboardingProgress({
  currentStep,
  totalSteps = 3,
  labels = ["Studio Basics", "Packages", "Go Live"],
}: OnboardingProgressProps) {
  return (
    <div className="mb-8">
      {/* Connector lines layer */}
      <div className="relative flex items-center justify-between">
        {/* Lines between circles */}
        <div className="absolute top-4 right-4 left-4 flex">
          {Array.from({ length: totalSteps - 1 }, (_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                i + 1 < currentStep
                  ? "bg-brand-600"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>

        {/* Step circles + labels */}
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className={`relative z-10 flex flex-col ${
              step === 1 ? "items-start" : step === totalSteps ? "items-end" : "items-center"
            }`}>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  isCompleted
                    ? "border-brand-600 bg-brand-600 text-white"
                    : isCurrent
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-gray-300 bg-white text-gray-400 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${
                  isCurrent
                    ? "text-brand-600 dark:text-brand-400"
                    : isCompleted
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
