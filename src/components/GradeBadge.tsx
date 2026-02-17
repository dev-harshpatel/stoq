import { memo } from "react";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  grade: "A" | "B" | "C" | "D";
  className?: string;
}

const gradeStyles = {
  A: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  B: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  C: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  D: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

export const GradeBadge = memo(function GradeBadge({
  grade,
  className,
}: GradeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold border",
        gradeStyles[grade],
        className
      )}
    >
      {grade}
    </span>
  );
});
