"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  completeAppTour,
  hasCompletedTour,
  TOUR_START_EVENT,
  TOUR_STEPS,
  type TourStep,
} from "@/lib/tour-steps";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

function getTooltipStyle(
  rect: DOMRect | null,
  placement: TourStep["placement"]
): React.CSSProperties {
  if (!rect || placement === "center") {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(92vw, 420px)",
    };
  }

  const padding = 12;
  const tooltipWidth = Math.min(window.innerWidth - 24, 360);

  switch (placement) {
    case "bottom":
      return {
        top: rect.bottom + padding,
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 12),
          window.innerWidth - tooltipWidth - 12
        ),
        width: tooltipWidth,
      };
    case "top":
      return {
        top: Math.max(rect.top - padding, 12),
        left: Math.min(
          Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 12),
          window.innerWidth - tooltipWidth - 12
        ),
        width: tooltipWidth,
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        top: Math.min(Math.max(rect.top, 12), window.innerHeight - 180),
        left: Math.max(rect.left - tooltipWidth - padding, 12),
        width: tooltipWidth,
      };
    case "right":
    default:
      return {
        top: Math.min(Math.max(rect.top, 12), window.innerHeight - 180),
        left: Math.min(rect.right + padding, window.innerWidth - tooltipWidth - 12),
        width: tooltipWidth,
      };
  }
}

export function AppTour() {
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const visibleSteps = useMemo(
    () =>
      TOUR_STEPS.filter((step) => {
        if (step.mobileOnly && isDesktop) return false;
        if (step.desktopOnly && !isDesktop) return false;
        return true;
      }),
    [isDesktop]
  );

  const step = visibleSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === visibleSteps.length - 1;

  const refreshTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      setTargetRect(null);
      return;
    }

    element.scrollIntoView({ block: "center", behavior: "smooth" });
    setTargetRect(element.getBoundingClientRect());
  }, [step]);

  const beginTour = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const finishTour = useCallback(() => {
    completeAppTour();
    setActive(false);
    setStepIndex(0);
    setTargetRect(null);
  }, []);

  useEffect(() => {
    if (!hasCompletedTour()) {
      const timer = window.setTimeout(beginTour, 900);
      return () => window.clearTimeout(timer);
    }
  }, [beginTour]);

  useEffect(() => {
    const handleStart = () => beginTour();
    window.addEventListener(TOUR_START_EVENT, handleStart);
    return () => window.removeEventListener(TOUR_START_EVENT, handleStart);
  }, [beginTour]);

  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [active, step, pathname, router]);

  useEffect(() => {
    if (!active || !step) return;

    const timer = window.setTimeout(refreshTarget, pathname === step.route ? 350 : 650);
    window.addEventListener("resize", refreshTarget);
    window.addEventListener("scroll", refreshTarget, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", refreshTarget);
      window.removeEventListener("scroll", refreshTarget, true);
    };
  }, [active, step, pathname, refreshTarget]);

  if (!active || !step) return null;

  const tooltipStyle = getTooltipStyle(targetRect, step.placement);

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      <div className="absolute inset-0 bg-black/55" />

      {targetRect && step.placement !== "center" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute rounded-xl ring-4 ring-yellow-500 ring-offset-2 ring-offset-transparent"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "absolute z-[101] rounded-xl border border-border bg-card p-4 shadow-2xl sm:p-5",
            step.placement === "center" && "text-center"
          )}
          style={tooltipStyle}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-500">
            Step {stepIndex + 1} of {visibleSteps.length}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finishTour}>
              Skip
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isFirst}
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) {
                    finishTour();
                    return;
                  }
                  setStepIndex((current) => Math.min(current + 1, visibleSteps.length - 1));
                }}
              >
                {isLast ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
