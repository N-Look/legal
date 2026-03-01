import { NextRequest, NextResponse } from 'next/server';
import {
  createThread,
  sendMessage,
  getOrCreatePlainAssistant,
} from '@/lib/backboard/client';
import type {
  SimulationRequest,
  SimulationResponse,
  CourtroomMessage,
  SimulationPhase,
  JuryScore,
  SimulationThreads,
} from '@/types/simulation';

// ---------------------------------------------------------------------------
// System prompts (injected into each message, not the assistant-level prompt)
// ---------------------------------------------------------------------------

function opposingCounselPrompt(
  caseName: string,
  caseDescription: string,
  opposingSide: string,
  phase: SimulationPhase,
  difficulty: string,
  recentTranscript: string,
) {
  return `You are an experienced opposing counsel in a courtroom simulation. You represent the ${opposingSide} in the case "${caseName}".

CASE CONTEXT: ${caseDescription}

YOUR ROLE:
- Challenge every argument made by the opposing attorney (the user).
- Raise objections when appropriate: hearsay, relevance, speculation, leading questions, assumes facts not in evidence, argumentative, asked and answered.
- When you object, begin your response with exactly "OBJECTION:" followed by the grounds (e.g., "OBJECTION: Hearsay — counsel is asking the witness to testify about out-of-court statements.").
- Cross-examine by pointing out weaknesses, contradictions, and gaps in the user's arguments.
- Reference case documents and evidence when available. Use the search_documents tool to find relevant passages.
- Stay in character at all times. Never break the fourth wall or acknowledge this is a simulation.

CURRENT PHASE: ${phase}
PHASE-SPECIFIC BEHAVIOR:
- opening: Deliver a counter-opening statement after the user's. Focus on previewing your strongest evidence.
- examination: Cross-examine witnesses. Challenge testimony. Object to improper questions.
- closing: Deliver a rebuttal closing argument. Summarize why the evidence favors your side.

DIFFICULTY: ${difficulty}
- standard: Object when clearly warranted. Be firm but fair.
- aggressive: Object frequently. Challenge every assertion. Be combative and look for procedural errors.

RECENT TRANSCRIPT:
${recentTranscript}

USER'S LATEST STATEMENT IS THE LAST MESSAGE ABOVE. Respond in 2-4 paragraphs. Be specific and cite evidence when possible.`;
}

function judgePrompt(
  caseName: string,
  phase: SimulationPhase,
  opposingCounselMessage: string,
  hasObjection: boolean,
  recentTranscript: string,
) {
  return `You are a presiding judge in a courtroom simulation for the case "${caseName}".

YOUR ROLE:
- Maintain courtroom order and enforce rules of evidence and procedure.
- When opposing counsel raises an OBJECTION, you MUST rule on it. Respond with exactly one of:
  - "SUSTAINED" at the very start, followed by a brief explanation and instruction to the attorney (e.g., rephrase, move on, strike from the record).
  - "OVERRULED" at the very start, followed by a brief explanation allowing the attorney to continue.
- When no objection is raised, you may:
  - Make brief procedural comments ("Counsel, please address the bench", "The witness may answer").
  - Stay silent by responding with exactly "SILENCE" (you will be omitted from the transcript).
- When a phase is ending, announce the transition AND include the marker at the END of your response.

CURRENT PHASE: ${phase}
PHASE TRANSITIONS — suggest a transition when:
- opening: After both sides have made opening statements (2+ user messages in this phase), add "PHASE:examination" at the very end of your message.
- examination: After 6+ exchanges OR the user says "no further questions" or "I rest", add "PHASE:closing" at the end.
- closing: After both sides have made closing arguments (2+ user messages), add "PHASE:verdict" at the end.

RECENT TRANSCRIPT:
${recentTranscript}

Opposing counsel's latest message: "${opposingCounselMessage}"
Did opposing counsel object? ${hasObjection ? 'YES' : 'NO'}

Keep responses to 1-3 sentences unless ruling on an objection. Be authoritative and concise.`;
}

function juryPrompt(
  caseName: string,
  currentScore: number,
  recentTranscript: string,
) {
  return `You are a jury foreperson evaluating arguments in the case "${caseName}".

YOUR ROLE:
- After each exchange, evaluate how persuasive the user-attorney's arguments were compared to opposing counsel.
- Return your evaluation as JSON only, in this exact format:
\`\`\`jury-score
{"score": <number 0-100>, "reasoning": "<one sentence>"}
\`\`\`

SCORING RULES:
- Current score: ${currentScore}.
- Shift by at most +/- 8 points per exchange.
- Strong evidence citations and logical arguments increase the score.
- Sustained objections against the user decrease the score by 3-5 extra points.
- Overruled objections against the user increase the score by 1-2 points (jury sympathizes).
- Contradictions with evidence decrease the score significantly (5-8 points).
- Emotional appeals without evidence have minimal effect (+/- 1 point).
- Score 0-30 = losing badly, 30-50 = behind, 50 = neutral, 50-70 = ahead, 70-100 = winning strongly.

RECENT EXCHANGE:
${recentTranscript}

Respond ONLY with the \`\`\`jury-score JSON block. No other text.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTranscript(messages: CourtroomMessage[], limit = 6): string {
  const recent = messages.slice(-limit);
  return recent
    .map((m) => {
      const roleLabel =
        m.role === 'user'
          ? 'USER ATTORNEY'
          : m.role === 'opposing-counsel'
            ? 'OPPOSING COUNSEL'
            : m.role === 'judge'
              ? 'JUDGE'
              : 'JURY';
      return `[${roleLabel}]: ${m.content}`;
    })
    .join('\n\n');
}

function detectObjection(text: string): boolean {
  return /^OBJECTION\s*[:!]/i.test(text.trim());
}

function detectRuling(text: string): 'sustained' | 'overruled' | null {
  const trimmed = text.trim().toUpperCase();
  if (trimmed.startsWith('SUSTAINED')) return 'sustained';
  if (trimmed.startsWith('OVERRULED')) return 'overruled';
  return null;
}

function detectPhaseTransition(text: string): SimulationPhase | null {
  const match = text.match(/PHASE:(examination|closing|verdict)/i);
  return match ? (match[1].toLowerCase() as SimulationPhase) : null;
}

function parseJuryScore(
  raw: string,
  currentScore: number,
): { score: number; reasoning: string } {
  const fencePatterns = [
    /```jury-score\s*\n?([\s\S]*?)```/,
    /```\s*jury-score\s*\n?([\s\S]*?)```/,
    /```json\s*\n?([\s\S]*?)```/,
    /\{[^{}]*"score"\s*:\s*\d+[^{}]*\}/,
  ];

  for (const pattern of fencePatterns) {
    const match = raw.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] ?? match[0];
        const parsed = JSON.parse(jsonStr.trim());
        const score = Math.max(0, Math.min(100, Number(parsed.score)));
        // Clamp delta to ±8
        const delta = score - currentScore;
        const clampedScore =
          currentScore + Math.max(-8, Math.min(8, delta));
        return {
          score: clampedScore,
          reasoning: parsed.reasoning ?? 'Score updated.',
        };
      } catch {
        // try next pattern
      }
    }
  }

  return { score: currentScore, reasoning: 'Jury is deliberating.' };
}

function makeMessage(
  role: CourtroomMessage['role'],
  content: string,
  phase: SimulationPhase,
  extra?: Partial<CourtroomMessage>,
): CourtroomMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    phase,
    timestamp: Date.now(),
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

const MOCK_OPPOSING_RESPONSES = [
  'OBJECTION: Relevance — counsel has not established how this testimony relates to the matter at hand. The witness has no personal knowledge of the events in question, and this entire line of questioning is a fishing expedition designed to confuse the jury rather than illuminate the facts.',
  'That is a bold claim, counsel, but the evidence tells a different story. Exhibit 3 clearly shows that your client was aware of the risk and chose to proceed anyway. The documents we have reviewed demonstrate a pattern of negligence that cannot be explained away by good intentions.',
  'OBJECTION: Hearsay — counsel is asking the witness to testify about statements made outside of court. These out-of-court statements are being offered for the truth of the matter asserted and do not fall under any recognized exception to the hearsay rule.',
  'I appreciate counsel\'s passionate delivery, but passion is not evidence. Let me direct the court\'s attention to the timeline established by Exhibits 1 through 4. When we examine the sequence of events, it becomes clear that my client acted reasonably and within the standard of care at every step.',
  'Counsel is attempting to mislead this jury with selective quotation. When read in full context, the document actually supports our position. The paragraph immediately following the excerpt counsel cited explicitly states that all protocols were followed.',
];

const MOCK_JUDGE_RESPONSES = [
  { content: 'SUSTAINED. Counsel, please rephrase your question to address the relevance to this case. The jury will disregard the last statement.', ruling: 'sustained' as const, forObjection: true },
  { content: 'OVERRULED. The witness may answer the question. Counsel, you may proceed.', ruling: 'overruled' as const, forObjection: true },
  { content: 'SUSTAINED. The testimony is hearsay and inadmissible. Counsel, move on to your next line of questioning.', ruling: 'sustained' as const, forObjection: true },
  { content: 'The court notes counsel\'s argument. Please continue.', ruling: undefined, forObjection: false },
  { content: 'SILENCE', ruling: undefined, forObjection: false },
];

let mockIndex = 0;

function getMockResponse(
  phase: SimulationPhase,
  messageCount: number,
  currentJuryScore: JuryScore,
): { messages: CourtroomMessage[]; juryScore: JuryScore; nextPhase: SimulationPhase } {
  const idx = mockIndex++ % MOCK_OPPOSING_RESPONSES.length;
  const opposingText = MOCK_OPPOSING_RESPONSES[idx];
  const isObjection = detectObjection(opposingText);

  const messages: CourtroomMessage[] = [];

  messages.push(makeMessage('opposing-counsel', opposingText, phase, {
    isObjection,
  }));

  // Judge response
  const judgeOptions = isObjection
    ? MOCK_JUDGE_RESPONSES.filter((r) => r.forObjection)
    : MOCK_JUDGE_RESPONSES.filter((r) => !r.forObjection);
  const judgeEntry = judgeOptions[idx % judgeOptions.length];

  if (judgeEntry.content !== 'SILENCE') {
    messages.push(makeMessage('judge', judgeEntry.content, phase, {
      ruling: judgeEntry.ruling,
    }));
  }

  // Jury score shift
  const delta = isObjection && judgeEntry.ruling === 'sustained' ? -4 : Math.round(Math.random() * 6 - 3);
  const newScore = Math.max(0, Math.min(100, currentJuryScore.userScore + delta));
  const juryScore: JuryScore = {
    userScore: newScore,
    reasoning: delta > 0
      ? 'Counsel made a reasonably persuasive point.'
      : delta < 0
        ? 'The objection weakened counsel\'s position.'
        : 'The exchange was evenly matched.',
    history: [
      ...currentJuryScore.history,
      { score: newScore, reason: delta > 0 ? 'Persuasive argument' : delta < 0 ? 'Objection impact' : 'Neutral exchange' },
    ],
  };

  // Phase transitions
  let nextPhase = phase;
  if (phase === 'opening' && messageCount >= 3) nextPhase = 'examination';
  else if (phase === 'examination' && messageCount >= 8) nextPhase = 'closing';
  else if (phase === 'closing' && messageCount >= 3) nextPhase = 'verdict';

  return { messages, juryScore, nextPhase };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body: SimulationRequest = await req.json();
    const { message, config, phase, threads, messageHistory, juryScore } = body;

    if (!message || !config || !phase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ------- Mock fallback -------
    if (!process.env.BACKBOARD_API_KEY) {
      await new Promise((r) => setTimeout(r, 1500));
      const phaseMessages = messageHistory.filter((m) => m.phase === phase);
      const mock = getMockResponse(phase, phaseMessages.length, juryScore);
      const response: SimulationResponse = {
        messages: mock.messages,
        threads,
        phase: mock.nextPhase,
        juryScore: mock.juryScore,
        phaseTransitionReason:
          mock.nextPhase !== phase
            ? `The court will now proceed to ${mock.nextPhase}.`
            : undefined,
      };
      return NextResponse.json(response);
    }

    // ------- Live Backboard orchestration -------
    const assistantId =
      config.assistantIds[0] ?? process.env.BACKBOARD_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistant available. Upload documents first.' },
        { status: 400 },
      );
    }

    const opposingSide =
      config.userRole === 'plaintiff' ? 'defense' : 'plaintiff';

    // Build transcript context from recent messages
    const fullHistory: CourtroomMessage[] = [
      ...messageHistory,
      makeMessage('user', message, phase),
    ];
    const transcript = buildTranscript(fullHistory, 6);

    // Ensure threads exist
    const updatedThreads: SimulationThreads = { ...threads };

    if (!updatedThreads.opposingCounsel) {
      const t = await createThread(assistantId);
      updatedThreads.opposingCounsel = t.thread_id;
    }
    if (!updatedThreads.judge) {
      const t = await createThread(assistantId);
      updatedThreads.judge = t.thread_id;
    }
    if (!updatedThreads.jury) {
      const plainId = await getOrCreatePlainAssistant(
        'You are a jury evaluation assistant. Respond only with JSON.',
      );
      const t = await createThread(plainId);
      updatedThreads.jury = t.thread_id;
    }

    const responseMessages: CourtroomMessage[] = [];
    let currentPhase = phase;

    // === Step 1: Opposing Counsel ===
    const ocPrompt = opposingCounselPrompt(
      config.caseName,
      config.caseDescription,
      opposingSide,
      currentPhase,
      config.difficulty,
      transcript,
    );
    const ocResult = await sendMessage(updatedThreads.opposingCounsel!, ocPrompt);
    const ocContent = ocResult.content;
    const isObjection = detectObjection(ocContent);

    responseMessages.push(
      makeMessage('opposing-counsel', ocContent, currentPhase, {
        isObjection,
      }),
    );

    // === Step 2: Judge ===
    const judgeTranscript = buildTranscript(
      [...fullHistory, responseMessages[0]],
      6,
    );
    const jPrompt = judgePrompt(
      config.caseName,
      currentPhase,
      ocContent,
      isObjection,
      judgeTranscript,
    );
    const judgeResult = await sendMessage(updatedThreads.judge!, jPrompt);
    const judgeContent = judgeResult.content.trim();

    // Check for phase transition
    const phaseTransition = detectPhaseTransition(judgeContent);
    let phaseTransitionReason: string | undefined;
    if (phaseTransition) {
      currentPhase = phaseTransition;
      phaseTransitionReason = judgeContent.replace(/PHASE:\w+/i, '').trim();
    }

    // Only add judge message if not silent
    if (judgeContent !== 'SILENCE') {
      const ruling = detectRuling(judgeContent);
      const cleanContent = judgeContent.replace(/PHASE:\w+/i, '').trim();
      responseMessages.push(
        makeMessage('judge', cleanContent, currentPhase, {
          ruling: ruling ?? undefined,
        }),
      );
    }

    // === Step 3: Jury ===
    const juryTranscript = buildTranscript(
      [...fullHistory, ...responseMessages],
      8,
    );
    const jyPrompt = juryPrompt(
      config.caseName,
      juryScore.userScore,
      juryTranscript,
    );
    const juryResult = await sendMessage(updatedThreads.jury!, jyPrompt, {
      modelName: 'claude-haiku-4-5-20251001',
    });
    const { score, reasoning } = parseJuryScore(
      juryResult.content,
      juryScore.userScore,
    );

    const updatedJuryScore: JuryScore = {
      userScore: score,
      reasoning,
      history: [...juryScore.history, { score, reason: reasoning }],
    };

    // === Verdict phase: auto-end after jury deliberates ===
    if (currentPhase === 'verdict') {
      const verdictMessage =
        score >= 50
          ? `After careful deliberation, the jury finds in favor of the ${config.userRole}. Final score: ${score}/100.`
          : `After careful deliberation, the jury finds against the ${config.userRole}. Final score: ${score}/100.`;
      responseMessages.push(
        makeMessage('jury', verdictMessage, 'verdict'),
      );
      currentPhase = 'ended';
    }

    const response: SimulationResponse = {
      messages: responseMessages,
      threads: updatedThreads,
      phase: currentPhase,
      juryScore: updatedJuryScore,
      phaseTransitionReason,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[simulation]', err);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
