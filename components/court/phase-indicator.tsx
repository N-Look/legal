"use client";

import { Check, Circle } from "lucide-react";
import type { SimulationPhase } from "@/types/simulation";

const PHASES: { key: SimulationPhase; label: string; short: string }[] = [
  { key: "opening", label: "Opening Statements", short: "I" },
  { key: "examination", label: "Examination", short: "II" },
  { key: "closing", label: "Closing Arguments", short: "III" },
  { key: "verdict", label: "Verdict", short: "IV" },
];

const PHASE_ORDER: Record<string, number> = {
  opening: 0,
  examination: 1,
  closing: 2,
  verdict: 3,
  ended: 4,
};

export function PhaseIndicator({ phase }: { phase: SimulationPhase }) {
  const currentIdx = PHASE_ORDER[phase] ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {PHASES.map((p, i) => {
        const isActive = p.key === phase;
        const isCompleted = currentIdx > i;
        const isFuture = currentIdx < i;

        return (
          <div key={p.key} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-4 h-px mx-0.5 ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
              } ${isFuture ? "opacity-40" : ""}`}
              title={p.label}
            >
              {isCompleted ? (
                <Check className="w-3 h-3" />
              ) : isActive ? (
                <Circle className="w-2.5 h-2.5 fill-current" />
              ) : null}
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.short}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
