"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Swords, Gavel, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSimulation } from "@/hooks/use-simulation";
import type { CourtroomMessage, SimulationPhase } from "@/types/simulation";

const PHASE_PLACEHOLDERS: Record<string, string> = {
  opening: "Deliver your opening statement to the court...",
  examination: "Examine the witness or present your argument...",
  closing: "Make your closing argument to the jury...",
  verdict: "The jury is deliberating...",
};

function roleIcon(role: CourtroomMessage["role"]) {
  switch (role) {
    case "opposing-counsel":
      return <Swords className="w-4 h-4" />;
    case "judge":
      return <Gavel className="w-4 h-4" />;
    default:
      return null;
  }
}

function roleLabel(role: CourtroomMessage["role"]) {
  switch (role) {
    case "user":
      return "You (Attorney)";
    case "opposing-counsel":
      return "Opposing Counsel";
    case "judge":
      return "Judge";
    case "jury":
      return "Jury";
  }
}

function roleBadgeClass(role: CourtroomMessage["role"]) {
  switch (role) {
    case "opposing-counsel":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    case "judge":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    case "jury":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400";
    default:
      return "";
  }
}

function MessageBubble({ msg }: { msg: CourtroomMessage }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  const isObjection = msg.isObjection;

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[80%] space-y-2 ${
          isObjection
            ? "border-l-4 border-red-400 pl-3"
            : ""
        }`}
      >
        {/* Role badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass(msg.role)}`}
          >
            {roleIcon(msg.role)}
            {roleLabel(msg.role)}
          </span>
          {isObjection && (
            <Badge variant="destructive" className="text-[10px]">
              OBJECTION
            </Badge>
          )}
          {msg.ruling && (
            <Badge
              className={`text-[10px] ${
                msg.ruling === "sustained"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
              }`}
            >
              {msg.ruling.toUpperCase()}
            </Badge>
          )}
        </div>
        {/* Content */}
        <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {msg.content}
          </p>
        </div>
      </div>
    </div>
  );
}

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

  // Auto-scroll to bottom
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
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Gavel className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">
              {phase === "opening"
                ? "The court is in session. Deliver your opening statement."
                : "Begin when you are ready, counsel."}
            </p>
          </div>
        )}
        {messages
          .filter((m) => m.role !== "jury")
          .map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

        {/* Typing indicator */}
        {sending && respondingRole && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {respondingRole} is responding...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Verdict / ended state */}
      {isVerdictPhase && (
        <div className="px-4 py-4 border-t border-border/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {phase === "verdict"
              ? "The jury is deliberating..."
              : "The simulation has ended."}
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            New Simulation
          </Button>
        </div>
      )}

      {/* Input area */}
      {!isVerdictPhase && (
        <div className="border-t border-border/50 p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder={
                PHASE_PLACEHOLDERS[phase as string] ??
                "Enter your statement..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none flex-1"
              disabled={!canSend}
            />
            <Button
              onClick={handleSend}
              disabled={!canSend || input.trim().length === 0}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
