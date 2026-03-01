import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a senior legal strategist embedded in an argument map tool. The lawyer has selected a specific node (argument point) in their case map and is asking you about it.

You understand both the specific point AND the broader case context. Your job is to help the lawyer:
- Analyze strengths and weaknesses of the argument
- Suggest supporting evidence or documents to look for
- Identify counterarguments the opposing side might raise
- Recommend how to strengthen the point for court
- Explain relevant legal doctrines or precedents

Rules:
- Be direct and practical. Start with the answer, not preamble.
- Reference specific documents from the case when available (the assistant has access to uploaded documents via search_documents).
- When citing document content, wrap quotes in «quote»...«/quote» markers.
- No markdown bold (**), no headers (#), no emojis.
- Use bullet points for lists.
- If you don't have enough information, say what additional evidence or research would help.`;

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
      : `CASE CONTEXT:
Claim: "${claim ?? 'Not specified'}"

SELECTED ARGUMENT POINT:
Title: ${nodeLabel ?? 'Unknown'}
Description: ${nodeDescription ?? 'No description'}

The lawyer is asking about this specific point in their argument map. Use the search_documents tool to find relevant evidence from uploaded case files, then answer their question.

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
      content: msg.content ?? '',
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
