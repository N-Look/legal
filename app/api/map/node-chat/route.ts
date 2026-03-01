import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a senior legal strategist helping a lawyer analyze their argument map. The lawyer has selected a specific argument point and is asking you about it.

You will receive the argument's title, full description, and the overall case claim as context. Your job is to analyze THIS SPECIFIC ARGUMENT using the information provided. You already have all the context you need in the message — do not say you lack information or that a search returned no results.

Your role:
- Analyze the strengths and weaknesses of the argument as described
- Identify counterarguments the opposing side might raise
- Suggest what evidence or documents would strengthen this point
- Recommend litigation strategy for this specific argument
- Reference relevant legal doctrines or precedents

If the assistant has access to a search_documents tool, you may use it to find additional supporting evidence from uploaded case files. But NEVER tell the user "the search returned no results" or "I couldn't find documents." If a search finds nothing, just answer based on the argument description provided.

FORMATTING RULES — follow these STRICTLY:
- Be direct and practical. Start with your analysis immediately, not preamble like "here's how to approach this."
- Use plain text paragraphs separated by blank lines. Write in flowing prose, not structured sections.
- For lists, use simple dash bullet points (- item). Do NOT use numbered lists.
- NEVER use markdown headers (###, ##, #). NEVER use bold or italic markup. NEVER use emojis.
- NEVER create titled sections like "Recommendations:", "Counterarguments:" etc. Weave analysis into natural paragraphs.
- Keep responses SHORT. Maximum 2-3 paragraphs, each 2-3 sentences. Total response must be under 150 words.
- NEVER start with disclaimers about search results, missing data, or what you couldn't find. Just answer the question.
- If the lawyer needs more detail, they will ask follow-up questions. Do not front-load everything into one response.`;

export async function POST(req: NextRequest) {
  try {
    const { message, threadId: existingThreadId, nodeLabel, nodeDescription, claim, assistantIds } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return NextResponse.json({ error: 'Message too short' }, { status: 400 });
    }

    const apiKey = process.env.BACKBOARD_API_KEY;
    const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

    if (!apiKey) {
      // Mock response when no API key
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({
        threadId: 'mock-thread',
        content: getMockResponse(nodeLabel, message),
        messageId: `mock-${Date.now()}`,
      });
    }

    // Pick the first available assistant (or env default)
    const ids = (assistantIds ?? []).filter(Boolean);
    const assistantId = ids[0] ?? process.env.BACKBOARD_ASSISTANT_ID;

    if (!assistantId) {
      return NextResponse.json({ error: 'No assistant available' }, { status: 400 });
    }

    // Reuse existing thread or create a new one
    let threadId = existingThreadId;
    if (!threadId) {
      // Update assistant with contextual system prompt
      try {
        await fetch(`${baseUrl}/assistants/${assistantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
          body: JSON.stringify({ system_prompt: SYSTEM_PROMPT }),
        });
      } catch {
        // Non-fatal
      }

      const threadRes = await fetch(`${baseUrl}/assistants/${assistantId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({}),
      });
      if (!threadRes.ok) {
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 502 });
      }
      const thread = await threadRes.json();
      threadId = thread.thread_id;
    }

    // Build contextual message
    const contextPrefix = existingThreadId
      ? '' // Follow-up messages don't need context re-injection
      : `Here is the argument point the lawyer is asking about:

Case claim: "${claim ?? 'Not specified'}"
Argument title: ${nodeLabel ?? 'Unknown'}
Argument description: ${nodeDescription ?? 'No description'}

Answer the lawyer's question using the argument details above. You have all the context you need.

---

`;

    const fullMessage = contextPrefix + message;

    const msgRes = await fetch(`${baseUrl}/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        content: fullMessage,
        memory: 'auto',
        send_to_llm: true,
      }),
    });

    if (!msgRes.ok) {
      const errBody = await msgRes.text();
      console.error(`[node-chat] Backboard message failed (${msgRes.status}):`, errBody);
      return NextResponse.json({ error: 'Chat request failed' }, { status: 502 });
    }

    const msg = await msgRes.json();

    return NextResponse.json({
      threadId,
      content: stripMarkdown(msg.content ?? ''),
      messageId: msg.message_id ?? `msg-${Date.now()}`,
    });
  } catch (e) {
    console.error('[node-chat] Error:', e);
    return NextResponse.json({ error: 'Chat request failed' }, { status: 500 });
  }
}

function getMockResponse(nodeLabel: string, message: string): string {
  const lower = (nodeLabel + ' ' + message).toLowerCase();

  if (lower.includes('weakness') || lower.includes('weak')) {
    return `The main vulnerability in this point is the gap between documentation and action. While records exist, the opposing side will argue that documentation without follow-through is actually evidence of negligence, not diligence.\n\nTo strengthen this:\n- Find evidence of ANY follow-up action taken after the documentation\n- Look for communications between staff members discussing the issue\n- Check whether similar situations in other schools led to different outcomes`;
  }

  if (lower.includes('strengthen') || lower.includes('stronger')) {
    return `To make this argument more compelling for court:\n- Obtain expert testimony that supports your interpretation of the evidence\n- Find comparable cases where courts ruled favorably on similar facts\n- Prepare a timeline showing the sequence of events to make the narrative clear\n- Anticipate the opposing counsel's counterarguments and prepare rebuttals`;
  }

  if (lower.includes('evidence') || lower.includes('document')) {
    return `Based on the case materials, you should look for:\n- Any internal communications (emails, memos) that corroborate this point\n- Witness statements that directly address this issue\n- Expert reports that establish the standard of care\n- Similar cases from this jurisdiction for precedent value\n\nThe strongest evidence would be contemporaneous documents created at the time of the events, rather than after-the-fact summaries.`;
  }

  return `This is an important point in the argument map. Here are my observations:\n\nStrengths:\n- The factual basis appears well-documented\n- This connects logically to the broader claim\n\nWeaknesses:\n- The opposing side could challenge the interpretation of the evidence\n- Additional corroborating evidence would strengthen the position\n\nRecommendation: Focus on building a clear chain of evidence from this point to the central claim. Consider what counterarguments the opposing counsel might raise and prepare responses.`;
}

function stripMarkdown(text: string): string {
  return text
    // Remove markdown headers (### Header → Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic (*text* or _text_) — careful not to match list dashes
    .replace(/(?<!\w)\*(?!\s)(.*?)(?<!\s)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_(?!\s)(.*?)(?<!\s)_(?!\w)/g, '$1')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
