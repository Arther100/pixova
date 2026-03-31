interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
  usedLabel: string;
  limitLabel: string;
  percent: number;
}

export default function UsageBar({ label, usedLabel, limitLabel, percent }: UsageBarProps) {
  const color =
    percent >= 90 ? "bg-red-500" :
    percent >= 70 ? "bg-amber-500" :
    "bg-brand-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {usedLabel}
          {limitLabel ? <span className="text-gray-400"> / {limitLabel}</span> : <span className="text-gray-400"> / Unlimited</span>}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="text-right text-xs text-gray-400">{percent}%</p>
    </div>
  );
}
