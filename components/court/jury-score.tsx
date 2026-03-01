"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JuryScore as JuryScoreType } from "@/types/simulation";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-green-500";
  if (score >= 30) return "text-orange-500";
  return "text-red-500";
}

function barColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-green-500";
  if (score >= 30) return "bg-orange-400";
  return "bg-red-500";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-50 dark:bg-emerald-950/30";
  if (score >= 50) return "bg-green-50 dark:bg-green-950/30";
  if (score >= 30) return "bg-orange-50 dark:bg-orange-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Winning strongly";
  if (score >= 50) return "Ahead";
  if (score >= 30) return "Behind";
  return "Losing badly";
}

export function JuryScorePanel({ juryScore }: { juryScore: JuryScoreType }) {
  const { userScore, reasoning, history } = juryScore;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Jury Persuasion</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Score display */}
        <div
          className={`rounded-xl p-4 flex flex-col items-center gap-2 ${scoreBg(userScore)}`}
        >
          <motion.span
            key={userScore}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-4xl font-bold tabular-nums ${scoreColor(userScore)}`}
          >
            {userScore}
          </motion.span>
          <span className="text-xs text-muted-foreground font-medium">
            / 100
          </span>
          <span
            className={`text-xs font-medium ${scoreColor(userScore)}`}
          >
            {scoreLabel(userScore)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor(userScore)}`}
            initial={false}
            animate={{ width: `${userScore}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>

        {/* Latest reasoning */}
        <AnimatePresence mode="wait">
          <motion.p
            key={reasoning}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-muted-foreground italic leading-relaxed"
          >
            &ldquo;{reasoning}&rdquo;
          </motion.p>
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              History
            </p>
            <div className="space-y-1.5">
              {history
                .slice()
                .reverse()
                .map((h, i) => {
                  const prev =
                    i < history.length - 1
                      ? history[history.length - 2 - i]?.score ?? 50
                      : 50;
                  const delta = h.score - prev;
                  return (
                    <div
                      key={`${i}-${h.score}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="font-mono tabular-nums w-7 text-right">
                        {h.score}
                      </span>
                      <span
                        className={
                          delta > 0
                            ? "text-green-500"
                            : delta < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : delta}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {h.reason}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
