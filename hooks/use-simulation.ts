"use client";

import { useMemo } from "react";
import { useSimulationContext } from "@/contexts/simulation-context";

const PHASE_LABELS: Record<string, string> = {
  setup: "Setup",
  opening: "Opening Statements",
  examination: "Examination",
  closing: "Closing Arguments",
  verdict: "Verdict",
  ended: "Ended",
};

export function useSimulation() {
  const ctx = useSimulationContext();

  const derived = useMemo(
    () => ({
      isActive:
        ctx.config !== null &&
        ctx.phase !== "setup" &&
        ctx.phase !== "ended",
      canSend: !ctx.sending && ctx.phase !== "setup" && ctx.phase !== "ended" && ctx.phase !== "verdict",
      phaseLabel: PHASE_LABELS[ctx.phase] ?? ctx.phase,
      isVerdictPhase: ctx.phase === "verdict" || ctx.phase === "ended",
    }),
    [ctx.config, ctx.phase, ctx.sending],
  );

  return { ...ctx, ...derived };
}
