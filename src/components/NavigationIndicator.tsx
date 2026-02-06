"use client";

import { Loader } from "@/components/Loader";
import { useNavigation } from "@/contexts/NavigationContext";

export function NavigationIndicator() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/40 backdrop-blur-[1px]"
      aria-live="polite"
      aria-label="Navigation in progress"
      role="status"
    >
      <Loader size="lg" text="Loading..." className="py-0" />
    </div>
  );
}
