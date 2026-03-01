"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SimulationPhase } from "@/types/simulation";

const PHASES: { key: SimulationPhase; label: string }[] = [
  { key: "opening", label: "Opening" },
  { key: "examination", label: "Examination" },
  { key: "closing", label: "Closing" },
  { key: "verdict", label: "Verdict" },
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
    <div className="flex items-center gap-2 px-1 py-3">
      {PHASES.map((p, i) => {
        const isActive = p.key === phase;
        const isCompleted = currentIdx > i;
        const isFuture = currentIdx < i;

        return (
          <div key={p.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-6 ${
                  isCompleted ? "bg-primary" : "bg-border"
                }`}
              />
            )}
            <Badge
              variant={
                isActive ? "default" : isCompleted ? "outline" : "secondary"
              }
              className={
                isFuture ? "opacity-50" : ""
              }
            >
              {isCompleted && <Check className="w-3 h-3 mr-1" />}
              {p.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
