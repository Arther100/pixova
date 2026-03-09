// ============================================
// ProfileCompletionBar — Reusable progress bar
// Shows profile completion percentage with color
// ============================================

"use client";

interface ProfileCompletionBarProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ProfileCompletionBar({
  score,
  showLabel = true,
  size = "md",
}: ProfileCompletionBarProps) {
  const getColor = () => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const barHeight = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Profile Completion
          </span>
          <span
            className={`text-sm font-semibold ${
              score >= 80
                ? "text-green-600 dark:text-green-400"
                : score >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {score}%
          </span>
        </div>
      )}
      <div
        className={`${barHeight} w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600`}
      >
        <div
          className={`${barHeight} rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}
