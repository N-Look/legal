"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { JuryScore as JuryScoreType } from "@/types/simulation";

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-green-600 dark:text-green-400";
  if (score >= 30) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function barGradient(score: number): string {
  if (score >= 70) return "from-emerald-500 to-emerald-400";
  if (score >= 50) return "from-green-500 to-green-400";
  if (score >= 30) return "from-orange-500 to-orange-400";
  return "from-red-500 to-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Strongly favorable";
  if (score >= 55) return "Leaning your way";
  if (score >= 45) return "Evenly split";
  if (score >= 30) return "Leaning against";
  return "Strongly unfavorable";
}

function ringColor(score: number): string {
  if (score >= 70) return "stroke-emerald-500";
  if (score >= 50) return "stroke-green-500";
  if (score >= 30) return "stroke-orange-400";
  return "stroke-red-500";
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          className="stroke-muted/40"
          strokeWidth="8"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          className={ringColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={score}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-3xl font-bold tabular-nums ${scoreColor(score)}`}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          of 100
        </span>
      </div>
    </div>
  );
}

export function JuryScorePanel({ juryScore }: { juryScore: JuryScoreType }) {
  const { userScore, reasoning, history } = juryScore;

  return (
    <div className="h-full flex flex-col bg-background rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Jury Box
          </p>
        </div>
      </div>

      {/* Score ring */}
      <div className="flex flex-col items-center pt-5 pb-3 px-4">
        <ScoreRing score={userScore} />
        <p className={`text-xs font-semibold mt-2 ${scoreColor(userScore)}`}>
          {scoreLabel(userScore)}
        </p>
      </div>

      {/* Leaning bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-medium">
          <span>Against</span>
          <span>Favor</span>
        </div>
        <div className="w-full h-2.5 bg-muted/60 rounded-full overflow-hidden relative">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-10" />
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient(userScore)}`}
            initial={false}
            animate={{ width: `${userScore}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
      </div>

      {/* Latest reasoning */}
      <div className="px-4 pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={reasoning}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-muted-foreground italic leading-relaxed bg-muted/30 rounded-lg px-3 py-2"
          >
            &ldquo;{reasoning}&rdquo;
          </motion.div>
        </AnimatePresence>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Score Changes
          </p>
          <div className="space-y-1">
            {history
              .slice()
              .reverse()
              .map((h, i) => {
                const prev =
                  i < history.length - 1
                    ? history[history.length - 2 - i]?.score ?? 50
                    : 50;
                const delta = h.score - prev;
                const DeltaIcon =
                  delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

                return (
                  <div
                    key={`${i}-${h.score}`}
                    className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0"
                  >
                    <DeltaIcon
                      className={`w-3 h-3 shrink-0 ${
                        delta > 0
                          ? "text-green-500"
                          : delta < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-mono tabular-nums w-6 text-right font-medium">
                      {h.score}
                    </span>
                    <span
                      className={`font-mono tabular-nums w-7 text-right text-[11px] ${
                        delta > 0
                          ? "text-green-500"
                          : delta < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta === 0 ? "±0" : String(delta)}
                    </span>
                    <span className="text-muted-foreground truncate flex-1">
                      {h.reason}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
