"use client";

import { useEffect, useState } from "react";

export function Toast({
  message,
  onDismiss,
  durationMs = 2500,
}: {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => setVisible(false), durationMs);
    const dismissTimer = setTimeout(onDismiss, durationMs + 200);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, onDismiss]);

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 dark:bg-green-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message}
    </div>
  );
}
