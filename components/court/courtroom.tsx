"use client";

import { SimulationProvider } from "@/contexts/simulation-context";
import { useSimulation } from "@/hooks/use-simulation";
import { SimulationSetup } from "./simulation-setup";
import { CourtroomChat } from "./courtroom-chat";
import { JuryScorePanel } from "./jury-score";
import { PhaseIndicator } from "./phase-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Landmark,
  Scale,
  Swords,
  Gavel,
  User,
} from "lucide-react";

// --- Role presence indicators ---
function RolePresence({
  icon: Icon,
  label,
  color,
  bg,
  active,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center transition-all ${
          active ? "ring-2 ring-offset-2 ring-offset-background ring-current " + color : ""
        }`}
      >
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function CourtroomInner() {
  const { phase, juryScore, startSimulation, reset, config, respondingRole } =
    useSimulation();

  if (phase === "setup") {
    return <SimulationSetup onStart={startSimulation} />;
  }

  const isExamination = phase === "examination";

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/30 to-background">
      {/* Courtroom header */}
      <div className="border-b border-border/60 bg-background px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate text-foreground">
                {config?.caseName}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {config?.userRole === "plaintiff"
                  ? "Appearing for the Plaintiff"
                  : "Appearing for the Defense"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <PhaseIndicator phase={phase} />
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              End Session
            </Button>
          </div>
        </div>
      </div>

      {/* Courtroom participants bar */}
      <div className="border-b border-border/50 bg-muted/40 px-5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <RolePresence
              icon={Gavel}
              label="Judge"
              color="text-amber-600 dark:text-amber-400"
              bg="bg-amber-100 dark:bg-amber-950/40"
              active={respondingRole === "Judge"}
            />
            {isExamination && (
              <RolePresence
                icon={User}
                label="Witness"
                color="text-blue-600 dark:text-blue-400"
                bg="bg-blue-100 dark:bg-blue-950/40"
                active={respondingRole === "Witness"}
              />
            )}
            <RolePresence
              icon={Swords}
              label="Opp. Counsel"
              color="text-red-600 dark:text-red-400"
              bg="bg-red-100 dark:bg-red-950/40"
              active={respondingRole === "Opposing Counsel"}
            />
            <RolePresence
              icon={Scale}
              label="You"
              color="text-primary"
              bg="bg-primary/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold tracking-wide text-muted-foreground border-border/60"
            >
              {config?.difficulty === "aggressive"
                ? "AGGRESSIVE"
                : "STANDARD"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main courtroom area — transcript + jury */}
      <div className="flex-1 flex min-h-0">
        {/* Transcript area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/30">
          <CourtroomChat />
        </div>

        {/* Jury sidebar */}
        <div className="w-72 shrink-0 bg-muted/20">
          <JuryScorePanel juryScore={juryScore} />
        </div>
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
