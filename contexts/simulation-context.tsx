"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
} from "react";
import type {
  CourtroomMessage,
  SimulationPhase,
  SimulationConfig,
  SimulationThreads,
  JuryScore,
  SimulationRequest,
  SimulationResponse,
} from "@/types/simulation";

interface SimulationContextValue {
  config: SimulationConfig | null;
  phase: SimulationPhase;
  messages: CourtroomMessage[];
  juryScore: JuryScore;
  sending: boolean;
  error: string | null;
  respondingRole: string | null;
  startSimulation: (config: SimulationConfig) => void;
  sendStatement: (message: string) => Promise<void>;
  reset: () => void;
}

const DEFAULT_JURY_SCORE: JuryScore = {
  userScore: 50,
  reasoning: "The jury is neutral.",
  history: [],
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [phase, setPhase] = useState<SimulationPhase>("setup");
  const [messages, setMessages] = useState<CourtroomMessage[]>([]);
  const [juryScore, setJuryScore] = useState<JuryScore>(DEFAULT_JURY_SCORE);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingRole, setRespondingRole] = useState<string | null>(null);
  const threadsRef = useRef<SimulationThreads>({
    opposingCounsel: null,
    judge: null,
    jury: null,
    witness: null,
  });

  const startSimulation = useCallback((cfg: SimulationConfig) => {
    setConfig(cfg);
    setPhase("opening");
    setMessages([]);
    setJuryScore(DEFAULT_JURY_SCORE);
    setError(null);
    threadsRef.current = { opposingCounsel: null, judge: null, jury: null, witness: null };
  }, []);

  const sendStatement = useCallback(
    async (message: string) => {
      if (!config) return;

      setSending(true);
      setError(null);

      const userMsg: CourtroomMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        phase,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        setRespondingRole(phase === "examination" ? "Witness" : "Opposing Counsel");

        const body: SimulationRequest = {
          message,
          config,
          phase,
          threads: threadsRef.current,
          messageHistory: messages,
          juryScore,
        };

        const res = await fetch("/api/simulation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Simulation request failed");
        }

        const data: SimulationResponse = await res.json();

        threadsRef.current = data.threads;
        setMessages((prev) => [...prev, ...data.messages]);
        setJuryScore(data.juryScore);

        if (data.phase !== phase) {
          setPhase(data.phase);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Simulation request failed");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setSending(false);
        setRespondingRole(null);
      }
    },
    [config, phase, messages, juryScore],
  );

  const reset = useCallback(() => {
    setConfig(null);
    setPhase("setup");
    setMessages([]);
    setJuryScore(DEFAULT_JURY_SCORE);
    setSending(false);
    setError(null);
    setRespondingRole(null);
    threadsRef.current = { opposingCounsel: null, judge: null, jury: null, witness: null };
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        config,
        phase,
        messages,
        juryScore,
        sending,
        error,
        respondingRole,
        startSimulation,
        sendStatement,
        reset,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext() {
  const ctx = useContext(SimulationContext);
  if (!ctx)
    throw new Error(
      "useSimulationContext must be inside SimulationProvider",
    );
  return ctx;
}
