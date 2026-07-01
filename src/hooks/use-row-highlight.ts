"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useRowHighlight(durationMs = 4500) {
  const [highlightRowId, setHighlightRowIdState] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHighlight = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHighlightRowIdState(null);
  }, []);

  const setHighlightRowId = useCallback(
    (id: string | null) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setHighlightRowIdState(id);

      if (id) {
        timeoutRef.current = setTimeout(() => {
          setHighlightRowIdState((current) => (current === id ? null : current));
          timeoutRef.current = null;
        }, durationMs);
      }
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { highlightRowId, setHighlightRowId, clearHighlight };
}
