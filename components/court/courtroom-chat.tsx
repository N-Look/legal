"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Swords,
  Gavel,
  Loader2,
  AlertCircle,
  RotateCcw,
  User,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSimulation } from "@/hooks/use-simulation";
import type { CourtroomMessage } from "@/types/simulation";

const PHASE_PLACEHOLDERS: Record<string, string> = {
  opening: "Deliver your opening statement to the court...",
  examination: "Ask the witness a question...",
  closing: "Make your closing argument to the jury...",
  verdict: "The jury is deliberating...",
};

// --- Role config ---
const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    avatarBg: string;
    avatarText: string;
  }
> = {
  user: {
    label: "You (Attorney)",
    icon: Scale,
    color: "text-primary",
    bg: "bg-primary/5 border-primary/20",
    avatarBg: "bg-primary",
    avatarText: "text-primary-foreground",
  },
  "opposing-counsel": {
    label: "Opposing Counsel",
    icon: Swords,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50/80 border-red-200/60 dark:bg-red-950/20 dark:border-red-900/40",
    avatarBg: "bg-red-600 dark:bg-red-700",
    avatarText: "text-white",
  },
  judge: {
    label: "Judge",
    icon: Gavel,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50/80 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40",
    avatarBg: "bg-amber-700 dark:bg-amber-600",
    avatarText: "text-white",
  },
  witness: {
    label: "Witness",
    icon: User,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50/80 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-900/40",
    avatarBg: "bg-blue-600 dark:bg-blue-700",
    avatarText: "text-white",
  },
  jury: {
    label: "Jury",
    icon: User,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50/80 border-purple-200/60 dark:bg-purple-950/20 dark:border-purple-900/40",
    avatarBg: "bg-purple-600 dark:bg-purple-700",
    avatarText: "text-white",
  },
};

// --- Objection banner ---
function ObjectionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center py-2"
    >
      <div className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full text-sm font-bold tracking-wide shadow-lg shadow-red-600/25">
        <ShieldAlert className="w-4 h-4" />
        OBJECTION
      </div>
    </motion.div>
  );
}

// --- Ruling banner ---
function RulingBanner({ ruling }: { ruling: "sustained" | "overruled" }) {
  const isSustained = ruling === "sustained";
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center py-1"
    >
      <div
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase ${
          isSustained
            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}
      >
        <Gavel className="w-3.5 h-3.5" />
        {ruling}
      </div>
    </motion.div>
  );
}

// --- Single transcript entry ---
function TranscriptEntry({ msg }: { msg: CourtroomMessage }) {
  const cfg = ROLE_CONFIG[msg.role] ?? ROLE_CONFIG.user;
  const Icon = cfg.icon;
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-1"
    >
      {/* Objection banner above the message */}
      {msg.isObjection && <ObjectionBanner />}

      {/* Ruling banner */}
      {msg.ruling && <RulingBanner ruling={msg.ruling} />}

      {/* Transcript line */}
      <div
        className={`flex gap-3 rounded-xl border px-4 py-3.5 ${cfg.bg} ${
          msg.role === "judge"
            ? "mx-4"
            : ""
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-full ${cfg.avatarBg} ${cfg.avatarText} flex items-center justify-center shrink-0 mt-0.5`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>
              {cfg.label}
            </span>
            {isUser && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {msg.phase}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {msg.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Main component ---
export function CourtroomChat() {
  const {
    messages,
    sending,
    error,
    phase,
    canSend,
    respondingRole,
    sendStatement,
    reset,
    isVerdictPhase,
  } = useSimulation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  function handleSend() {
    const text = input.trim();
    if (!text || !canSend) return;
    setInput("");
    sendStatement(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Transcript area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-3"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
              <Gavel className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-foreground">
                {phase === "opening"
                  ? "Court Is Now in Session"
                  : phase === "examination"
                    ? "The Witness Has Taken the Stand"
                    : phase === "closing"
                      ? "Time for Closing Arguments"
                      : "Awaiting Proceedings"}
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                {phase === "opening"
                  ? "All rise. You may deliver your opening statement to the jury."
                  : phase === "examination"
                    ? "The witness is sworn in and ready. You may begin your examination."
                    : phase === "closing"
                      ? "Present your closing argument. Summarize the evidence and persuade the jury."
                      : "Begin when you are ready, counsel."}
              </p>
            </div>
          </div>
        )}

        {/* Transcript entries */}
        <AnimatePresence initial={false}>
          {messages
            .filter((m) => m.role !== "jury")
            .map((msg) => (
              <TranscriptEntry key={msg.id} msg={msg} />
            ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && respondingRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground italic">
              {respondingRole} is responding...
            </span>
          </motion.div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-2 px-4 py-2.5 rounded-lg bg-destructive/10 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Verdict / ended state */}
      {isVerdictPhase && (
        <div className="mx-5 mb-4 px-5 py-4 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {phase === "verdict"
                ? "The Jury Is Deliberating..."
                : "Proceedings Have Concluded"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {phase === "verdict"
                ? "The jury is reviewing all testimony and evidence."
                : "The court thanks both counselors for their arguments."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            New Case
          </Button>
        </div>
      )}

      {/* Input area */}
      {!isVerdictPhase && (
        <div className="border-t border-border/50 bg-muted/20 px-5 py-4">
          <div className="flex gap-3">
            {/* Attorney avatar */}
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                placeholder={
                  PHASE_PLACEHOLDERS[phase as string] ??
                  "Enter your statement..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="resize-none bg-background border-border/60"
                disabled={!canSend}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Enter to send, Shift+Enter for new line
                </p>
                <Button
                  onClick={handleSend}
                  disabled={!canSend || input.trim().length === 0}
                  size="sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit to Court
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
