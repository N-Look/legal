"use client";

import { SimulationProvider } from "@/contexts/simulation-context";
import { useSimulation } from "@/hooks/use-simulation";
import { SimulationSetup } from "./simulation-setup";
import { CourtroomChat } from "./courtroom-chat";
import { JuryScorePanel } from "./jury-score";
import { PhaseIndicator } from "./phase-indicator";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

function CourtroomInner() {
  const { phase, juryScore, startSimulation, reset, config } = useSimulation();

  if (phase === "setup") {
    return <SimulationSetup onStart={startSimulation} />;
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background rounded-xl border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {config?.caseName}
            </h2>
            <PhaseIndicator phase={phase} />
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
        <CourtroomChat />
      </div>

      {/* Jury score sidebar */}
      <div className="w-64 shrink-0">
        <JuryScorePanel juryScore={juryScore} />
      </div>
    </div>
  );
}

export function Courtroom() {
  return (
    <SimulationProvider>
      <CourtroomInner />
    </SimulationProvider>
  );
}
