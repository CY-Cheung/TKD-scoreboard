import { useEffect } from "react";

/**
 * Drop the oldest toast after `ms` when the queue is non-empty.
 */
export function useToastAutoDismiss(toastMessages, setToastMessages, ms = 4000) {
  useEffect(() => {
    if (toastMessages.length === 0) return undefined;
    const timer = setTimeout(() => {
      setToastMessages((prev) => prev.slice(1));
    }, ms);
    return () => clearTimeout(timer);
  }, [toastMessages, setToastMessages, ms]);
}
