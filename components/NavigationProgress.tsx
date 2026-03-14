// ============================================
// NavigationProgress — Top progress bar during navigation
// ============================================

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<NodeJS.Timeout>();
  const interval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Navigation started — show bar immediately
    setVisible(true);
    setProgress(10);

    // Simulate progress up to 85%
    interval.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) {
          clearInterval(interval.current);
          return 85;
        }
        return p + Math.random() * 15;
      });
    }, 200);

    // Navigation complete — finish bar
    timer.current = setTimeout(() => {
      clearInterval(interval.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }, 500);

    return () => {
      clearInterval(interval.current);
      clearTimeout(timer.current);
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #DAA520, #FFD700)",
          boxShadow: "0 0 8px rgba(218,165,32,0.6)",
        }}
      />
    </div>
  );
}
