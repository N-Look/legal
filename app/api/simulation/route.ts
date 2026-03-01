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
// System prompts
// ---------------------------------------------------------------------------

function witnessPrompt(
  caseName: string,
  caseDescription: string,
  phase: SimulationPhase,
  recentTranscript: string,
) {
  return `You are a witness on the stand in a courtroom proceeding for the case "${caseName}".

CASE CONTEXT: ${caseDescription}

YOUR ROLE:
- You are testifying under oath. Answer questions from the examining attorney (the user) truthfully based on what you know from the case documents.
- Use the search_documents tool to find relevant information before answering. Your testimony MUST be grounded in the actual case documents and evidence.
- Answer ONLY the specific question asked. Do not volunteer extra information unless directly asked.
- If you don't know something or it's not in the documents, say "I don't recall" or "I'm not aware of that."
- Speak in first person as a witness would. Be natural and conversational, not robotic.
- If the question is unclear, ask for clarification: "Could you rephrase that, counsel?"
- If the judge sustained an objection to the question, do NOT answer — just wait silently. Respond with "WAIT" (you will be omitted).
- Stay in character. You are a real person with knowledge of the events. Never reference being an AI.

IMPORTANT BEHAVIOR:
- On the FIRST question (like "state your name"), introduce yourself as a witness relevant to the case. Pick a name and role from the case documents (e.g., a teacher, administrator, counselor, expert, or party involved). Use the search_documents tool to determine who you should be.
- After introducing yourself, answer subsequent questions based on that witness's perspective and knowledge.
- Be specific. Quote documents, dates, and events when possible.
- If asked about something outside your character's knowledge, say "That's outside my direct knowledge" or "I wasn't present for that."

CURRENT PHASE: ${phase}

RECENT TRANSCRIPT:
${recentTranscript}

THE ATTORNEY'S LATEST QUESTION IS THE LAST MESSAGE. Answer it directly and concisely (1-3 paragraphs). Stay in character.`;
}

function opposingCounselPrompt(
  caseName: string,
  caseDescription: string,
  opposingSide: string,
  phase: SimulationPhase,
  difficulty: string,
  recentTranscript: string,
) {
  const examinationInstructions = phase === 'examination'
    ? `
EXAMINATION PHASE RULES:
- The user is currently examining a witness on the stand.
- You should OBJECT to improper questions (leading, hearsay, speculation, relevance, assumes facts not in evidence, argumentative, asked and answered).
- You may also make brief strategic comments AFTER the witness answers, noting contradictions or weaknesses for the record.
- Do NOT try to examine the witness yourself during the user's direct examination. You will get your turn to cross-examine.
- If the question and answer were proper and unremarkable, respond with "NO COMMENT" (you will be omitted from the transcript).
- If you object, begin with exactly "OBJECTION:" followed by the grounds. Do NOT also provide a substantive response — just the objection.`
    : '';

  return `You are an experienced opposing counsel in a courtroom simulation. You represent the ${opposingSide} in the case "${caseName}".

CASE CONTEXT: ${caseDescription}

YOUR ROLE:
- Challenge every argument made by the opposing attorney (the user).
- Raise objections when appropriate: hearsay, relevance, speculation, leading questions, assumes facts not in evidence, argumentative, asked and answered.
- When you object, begin your response with exactly "OBJECTION:" followed by the grounds (e.g., "OBJECTION: Hearsay — counsel is asking the witness to testify about out-of-court statements.").
- Reference case documents and evidence when available. Use the search_documents tool to find relevant passages.
- Stay in character at all times. Never break the fourth wall or acknowledge this is a simulation.
${examinationInstructions}

CURRENT PHASE: ${phase}
PHASE-SPECIFIC BEHAVIOR:
- opening: Deliver a counter-opening statement after the user's. Focus on previewing your strongest evidence.
- examination: Watch the questioning and object when warranted. Note contradictions for later.
- closing: Deliver a rebuttal closing argument. Summarize why the evidence favors your side.

DIFFICULTY: ${difficulty}
- standard: Object when clearly warranted. Be firm but fair. During examination, use "NO COMMENT" often when questions are proper.
- aggressive: Object frequently. Challenge every assertion. Be combative and look for procedural errors.

RECENT TRANSCRIPT:
${recentTranscript}

USER'S LATEST STATEMENT IS THE LAST MESSAGE ABOVE. Respond in 1-4 paragraphs (or "NO COMMENT" if nothing to object to during examination). Be specific and cite evidence when possible.`;
}

function judgePrompt(
  caseName: string,
  phase: SimulationPhase,
  opposingCounselMessage: string,
  hasObjection: boolean,
  recentTranscript: string,
) {
  const examinationInstructions = phase === 'examination'
    ? `
EXAMINATION PHASE RULES:
- A witness is on the stand being examined by the user (attorney).
- If opposing counsel objected, you MUST rule on the objection.
- If the objection is SUSTAINED, instruct the attorney to rephrase or move on. The witness should NOT answer the question.
- If the objection is OVERRULED, instruct the witness to answer: "The witness may answer."
- If no objection was raised, you may stay silent ("SILENCE") or make brief procedural guidance.`
    : '';

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
${examinationInstructions}

CURRENT PHASE: ${phase}
PHASE TRANSITIONS — suggest a transition when:
- opening: After both sides have made opening statements (2+ user messages in this phase), add "PHASE:examination" at the very end of your message.
- examination: After 8+ exchanges OR the user says "no further questions" or "I rest", add "PHASE:closing" at the end.
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
- During examination, evaluate the quality of questioning and whether the witness testimony helped or hurt the user's case.
- Return your evaluation as JSON only, in this exact format:
\`\`\`jury-score
{"score": <number 0-100>, "reasoning": "<one sentence>"}
\`\`\`

SCORING RULES:
- Current score: ${currentScore}.
- Shift by at most +/- 8 points per exchange.
- Strong evidence citations and logical arguments increase the score.
- Effective witness examination that elicits helpful testimony: +3 to +6 points.
- Poor questioning that lets the witness ramble or contradict the user's case: -2 to -4 points.
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

function buildTranscript(messages: CourtroomMessage[], limit = 8): string {
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
              : m.role === 'witness'
                ? 'WITNESS'
                : 'JURY';
      return `[${roleLabel}]: ${m.content}`;
    })
    .join('\n\n');
}

function detectObjection(text: string): boolean {
  return /^OBJECTION\s*[:!]/i.test(text.trim());
}

function detectNoComment(text: string): boolean {
  return /^NO\s*COMMENT$/i.test(text.trim());
}

function detectWait(text: string): boolean {
  return /^WAIT$/i.test(text.trim());
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

const MOCK_WITNESS_RESPONSES = [
  'My name is Presley Fisher. I\'m a teacher at Midville Community School. I\'ve been employed there for about seven years now, primarily teaching English and Language Arts to the middle school students.',
  'Yes, I was aware of the situation with Terry Smith. I personally observed an incident in my classroom where another student made derogatory comments toward Terry. I documented it immediately and filed a report with administration following the Four-Step Response Protocol.',
  'I completed the mandatory DOE-approved anti-bullying training. We were trained to identify warning signs, document incidents, and report them through the proper administrative channels. I followed that protocol exactly.',
  'I sent a written memo to the administration — that would be Exhibit 4. In that memo, I described what I witnessed, the students involved, and the steps I had already taken in the classroom. I submitted it the same day as the incident.',
  'I\'m not aware of what specific actions administration took after receiving my memo. That would be outside my direct knowledge. I can only speak to what I personally observed and reported.',
];

const MOCK_OPPOSING_RESPONSES_EXAM = [
  'NO COMMENT',
  'OBJECTION: Leading — counsel is putting words in the witness\'s mouth rather than allowing the witness to testify from their own recollection.',
  'NO COMMENT',
  'OBJECTION: Assumes facts not in evidence — counsel\'s question presupposes that the administration received and read the memo, which has not been established through testimony.',
  'NO COMMENT',
];

const MOCK_OPPOSING_RESPONSES_OTHER = [
  'Ladies and gentlemen, what you just heard from opposing counsel was a carefully crafted narrative — rich in emotion, but dangerously thin on facts. The evidence will show that this school had training resources and procedures in place, and that school administrators responded to complaints through proper channels.',
  'That is a bold claim, counsel, but the evidence tells a different story. Exhibit 3 clearly shows that your client was aware of the risk and chose to proceed anyway.',
  'I appreciate counsel\'s passionate delivery, but passion is not evidence. Let me direct the court\'s attention to the timeline established by Exhibits 1 through 4.',
  'Counsel is attempting to mislead this jury with selective quotation. When read in full context, the document actually supports our position.',
  'At the close of this case, the evidence will show that the school acted reasonably and responded appropriately, and that the harm alleged by Terry Smith cannot be laid at the feet of this institution.',
];

const MOCK_JUDGE_RESPONSES = [
  { content: 'SUSTAINED. Counsel, please rephrase your question without leading the witness. The jury will disregard the characterization in counsel\'s question.', ruling: 'sustained' as const, forObjection: true },
  { content: 'OVERRULED. The witness may answer the question. Counsel, you may proceed.', ruling: 'overruled' as const, forObjection: true },
  { content: 'SUSTAINED. Counsel, you have not established the foundation for this question. Please lay proper foundation before proceeding.', ruling: 'sustained' as const, forObjection: true },
  { content: 'The court notes counsel\'s argument. Please continue.', ruling: undefined, forObjection: false },
  { content: 'SILENCE', ruling: undefined, forObjection: false },
];

let mockIndex = 0;

function getMockResponse(
  phase: SimulationPhase,
  messageCount: number,
  currentJuryScore: JuryScore,
): { messages: CourtroomMessage[]; juryScore: JuryScore; nextPhase: SimulationPhase } {
  const idx = mockIndex++ % 5;
  const messages: CourtroomMessage[] = [];

  if (phase === 'examination') {
    // Witness answers first
    const witnessText = MOCK_WITNESS_RESPONSES[idx % MOCK_WITNESS_RESPONSES.length];
    messages.push(makeMessage('witness', witnessText, phase));

    // Opposing counsel may object or stay silent
    const ocText = MOCK_OPPOSING_RESPONSES_EXAM[idx % MOCK_OPPOSING_RESPONSES_EXAM.length];
    const isObjection = detectObjection(ocText);
    const isNoComment = detectNoComment(ocText);

    if (!isNoComment) {
      messages.push(makeMessage('opposing-counsel', ocText, phase, { isObjection }));
    }

    // Judge rules if objection
    if (isObjection) {
      const judgeOptions = MOCK_JUDGE_RESPONSES.filter((r) => r.forObjection);
      const judgeEntry = judgeOptions[idx % judgeOptions.length];
      messages.push(makeMessage('judge', judgeEntry.content, phase, { ruling: judgeEntry.ruling }));
    }
  } else {
    // Opening / closing — no witness
    const opposingText = MOCK_OPPOSING_RESPONSES_OTHER[idx % MOCK_OPPOSING_RESPONSES_OTHER.length];
    const isObjection = detectObjection(opposingText);
    messages.push(makeMessage('opposing-counsel', opposingText, phase, { isObjection }));

    const judgeOptions = isObjection
      ? MOCK_JUDGE_RESPONSES.filter((r) => r.forObjection)
      : MOCK_JUDGE_RESPONSES.filter((r) => !r.forObjection);
    const judgeEntry = judgeOptions[idx % judgeOptions.length];

    if (judgeEntry.content !== 'SILENCE') {
      messages.push(makeMessage('judge', judgeEntry.content, phase, { ruling: judgeEntry.ruling }));
    }
  }

  // Jury score shift
  const hasObjection = messages.some((m) => m.isObjection);
  const hasSustained = messages.some((m) => m.ruling === 'sustained');
  const delta = hasObjection && hasSustained ? -4 : Math.round(Math.random() * 6 - 2);
  const newScore = Math.max(0, Math.min(100, currentJuryScore.userScore + delta));
  const juryScore: JuryScore = {
    userScore: newScore,
    reasoning: phase === 'examination'
      ? (delta > 0 ? 'Effective witness examination.' : delta < 0 ? 'The objection disrupted counsel\'s momentum.' : 'Routine testimony.')
      : (delta > 0 ? 'Counsel made a persuasive point.' : delta < 0 ? 'The objection weakened counsel\'s position.' : 'The exchange was evenly matched.'),
    history: [
      ...currentJuryScore.history,
      { score: newScore, reason: phase === 'examination' ? 'Witness examination' : (delta > 0 ? 'Persuasive argument' : delta < 0 ? 'Objection impact' : 'Neutral exchange') },
    ],
  };

  // Phase transitions
  let nextPhase = phase;
  if (phase === 'opening' && messageCount >= 3) nextPhase = 'examination';
  else if (phase === 'examination' && messageCount >= 10) nextPhase = 'closing';
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

    const fullHistory: CourtroomMessage[] = [
      ...messageHistory,
      makeMessage('user', message, phase),
    ];
    const transcript = buildTranscript(fullHistory, 8);

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
    if (!updatedThreads.witness) {
      const t = await createThread(assistantId);
      updatedThreads.witness = t.thread_id;
    }

    const responseMessages: CourtroomMessage[] = [];
    let currentPhase = phase;

    // ===================================================================
    // EXAMINATION PHASE: Witness → Opposing Counsel → Judge
    // ===================================================================
    if (phase === 'examination') {
      // Step 1: Witness answers the question
      const wPrompt = witnessPrompt(
        config.caseName,
        config.caseDescription,
        currentPhase,
        transcript,
      );
      const witnessResult = await sendMessage(updatedThreads.witness!, wPrompt);
      const witnessContent = witnessResult.content.trim();

      if (!detectWait(witnessContent)) {
        responseMessages.push(
          makeMessage('witness', witnessContent, currentPhase),
        );
      }

      // Step 2: Opposing Counsel reacts (may object or "NO COMMENT")
      const examTranscript = buildTranscript(
        [...fullHistory, ...responseMessages],
        8,
      );
      const ocPrompt = opposingCounselPrompt(
        config.caseName,
        config.caseDescription,
        opposingSide,
        currentPhase,
        config.difficulty,
        examTranscript,
      );
      const ocResult = await sendMessage(updatedThreads.opposingCounsel!, ocPrompt);
      const ocContent = ocResult.content.trim();
      const isObjection = detectObjection(ocContent);
      const isNoComment = detectNoComment(ocContent);

      if (!isNoComment) {
        responseMessages.push(
          makeMessage('opposing-counsel', ocContent, currentPhase, {
            isObjection,
          }),
        );
      }

      // Step 3: Judge rules if objection, otherwise may stay silent
      if (isObjection) {
        const judgeTranscript = buildTranscript(
          [...fullHistory, ...responseMessages],
          8,
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

        const phaseTransition = detectPhaseTransition(judgeContent);
        if (phaseTransition) {
          currentPhase = phaseTransition;
        }

        if (judgeContent !== 'SILENCE') {
          const ruling = detectRuling(judgeContent);
          const cleanContent = judgeContent.replace(/PHASE:\w+/i, '').trim();
          responseMessages.push(
            makeMessage('judge', cleanContent, currentPhase, {
              ruling: ruling ?? undefined,
            }),
          );
        }
      }

      // Check if user said "no further questions" to trigger phase transition
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('no further questions') || lowerMsg.includes('i rest') || lowerMsg.includes('nothing further')) {
        currentPhase = 'closing';
      }
    }
    // ===================================================================
    // OPENING / CLOSING: Opposing Counsel → Judge (no witness)
    // ===================================================================
    else {
      // Step 1: Opposing Counsel
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

      // Step 2: Judge
      const judgeTranscript = buildTranscript(
        [...fullHistory, responseMessages[0]],
        8,
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

      const phaseTransition = detectPhaseTransition(judgeContent);
      if (phaseTransition) {
        currentPhase = phaseTransition;
      }

      if (judgeContent !== 'SILENCE') {
        const ruling = detectRuling(judgeContent);
        const cleanContent = judgeContent.replace(/PHASE:\w+/i, '').trim();
        responseMessages.push(
          makeMessage('judge', cleanContent, currentPhase, {
            ruling: ruling ?? undefined,
          }),
        );
      }
    }

    // === Jury evaluation (all phases) ===
    const juryTranscript = buildTranscript(
      [...fullHistory, ...responseMessages],
      10,
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

    // === Verdict phase: auto-end ===
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
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[simulation]', err);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
