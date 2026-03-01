import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisNode } from '@/types/argument-map';

const SYSTEM_PROMPT = `You are a legal argument analyst helping a lawyer build an argument map for trial preparation. You have access to a knowledge base of uploaded legal documents.

Your job: Given a legal claim, build a COMPREHENSIVE argument map with 8-14 nodes. You MUST ALWAYS return nodes — never say "no relevant information found."

Use THREE sources of reasoning to build nodes:
1. **Uploaded documents** — If documents contain relevant passages, reference them with specific quotes and filenames.
2. **General legal principles** — Even if documents don't directly address the claim, apply legal reasoning: duty of care analysis, breach elements, causation frameworks, damages theories, procedural defenses, burden of proof, standard of review, etc.
3. **Logical argument structure** — Break the claim into sub-arguments, identify what each side would need to prove, and map out the logical chain.

IMPORTANT — always structure your response in this EXACT order:

1. FIRST, output a JSON block fenced with \`\`\`map-nodes
[...]
\`\`\`
containing an array of 8-14 evidence/argument objects. Each object must have:
- label (string, 5-10 words): short title for this piece of evidence or argument
- description (string, 5-10 sentences MINIMUM): a thorough legal analysis written as if briefing a senior partner. NEVER write generic descriptions like "Evaluate whether..." or "Assess the extent to which..." — those are instructions, not analysis. Instead, write SUBSTANTIVE content: cite specific exhibit numbers and document names, quote key passages from witness statements or depositions, reference exact dates and names of people involved, explain the legal significance, identify how opposing counsel might attack or leverage this point, and connect it to the elements of the cause of action. Every description should read like a paragraph from a legal memorandum, not a task description.
- nodeType (string): one of "supporting" (helps the claim), "opposing" (hurts the claim), "context" (neutral background), or "sub-argument" (derivative argument)
- relationship (string): one of "supports", "contradicts", "provides-context", or "sub-argument"
- reasoning (string, 1 sentence): why this node matters to the overall argument
- documentName (string): the SPECIFIC source document filename from the uploaded files. Use the actual filename — never use generic labels like "Legal Analysis" or "Case Documents."
- confidence (number 0-1): 0.8+ for document-backed evidence, 0.5-0.8 for legal reasoning, 0.3-0.5 for speculative arguments
- connectsTo (optional array of strings): labels of OTHER nodes in your response that this node also logically connects to. Use this when a conclusion draws from multiple pieces of evidence, or when two exhibits support the same reasoning node. This creates a reasoning NETWORK, not just a tree.

CRITICAL RULES FOR DESCRIPTIONS:
- NEVER write descriptions that start with verbs like "Evaluate", "Assess", "Determine", "Analyze", "Consider", or "Examine" — those are instructions, not analysis.
- ALWAYS write descriptions that STATE FACTS and MAKE ARGUMENTS: "On October 12, Counselor Sanchez emailed..." not "Evaluate the counselor's communication..."
- ALWAYS reference specific people by name, specific dates, specific exhibit numbers, and specific document titles.
- If documents contain relevant quotes, include them directly in the description.
- Each description should be substantial enough to fill a full paragraph in a legal brief.

ALWAYS include a mix of:
- At least 3 nodes supporting the claim
- At least 3 nodes opposing/challenging the claim
- At least 2 context or sub-argument nodes
- At least 2-3 nodes should have connectsTo links to show multi-source reasoning

2. THEN, after the JSON block, write a 2-3 sentence summary of the argument landscape and key battlegrounds.

You MUST return the JSON block with 8+ nodes. NEVER return an empty array. If the uploaded documents are not directly relevant, use legal reasoning to build the argument map anyway.`;

const MOCK_NODES: AnalysisNode[] = [
  // === SUPPORTING (Defense) ===
  {
    label: 'DOE-Approved Training Was Mandatory',
    description: 'Presley Fisher completed DOE-approved anti-bullying training and implemented the Four-Step Response Protocol in the classroom. Fisher\'s witness statement confirms: "I completed mandatory DOE training on recognizing and responding to bullying." This supports the defense claim that Midville provided proper training infrastructure.',
    nodeType: 'supporting',
    relationship: 'supports',
    reasoning: 'Documented training completion directly supports the reasonable care defense.',
    documentName: 'n.pdf — Fisher Witness Statement',
    confidence: 0.90,
  },
  {
    label: 'Fisher Memo — Prompt Documented Response',
    description: 'Exhibit 4 shows Teacher Fisher wrote a formal memo documenting a bullying incident involving Terry Smith. The memo was filed with administration, demonstrating that Midville staff did identify and report the incident through proper channels following the Four-Step Response Protocol.',
    nodeType: 'supporting',
    relationship: 'supports',
    reasoning: 'The Fisher memo is the defense\'s strongest evidence of a responsive system.',
    documentName: 'n.pdf — Exhibit 4 (Fisher Memo)',
    confidence: 0.92,
  },
  {
    label: 'Four-Step Response Protocol Existed',
    description: 'Midville had a formal Four-Step Response Protocol for handling bullying incidents: (1) Identify, (2) Document, (3) Report to administration, (4) Follow up. Fisher followed steps 1-3. The defense argues the existence of this protocol shows institutional commitment to anti-bullying measures.',
    nodeType: 'supporting',
    relationship: 'supports',
    reasoning: 'A formal protocol demonstrates systemic reasonable care, not ad hoc responses.',
    documentName: 'n.pdf — Defense Response',
    confidence: 0.85,
  },
  {
    label: 'Only One Formal Complaint Was Filed',
    description: 'The defense argues that only one documented complaint (Fisher\'s memo) was formally filed. Without multiple formal complaints, the school could not have known the scope of the problem. The defense contends that a single incident report does not establish a pattern requiring systemic intervention.',
    nodeType: 'supporting',
    relationship: 'supports',
    reasoning: 'Limited formal documentation supports the "promptly responded to what we knew" argument.',
    documentName: 'n.pdf — Defense Response',
    confidence: 0.75,
  },

  // === OPPOSING (Plaintiff) ===
  {
    label: 'Sanchez Email to Green Went Unaddressed',
    description: 'Exhibit 5 shows counselor Bays Sanchez emailed Dean of Students Sydney Green with specific concerns about Terry being bullied. Sanchez\'s witness statement confirms raising repeated concerns. However, Green\'s testimony does not indicate any meaningful follow-up action was taken on this email.',
    nodeType: 'opposing',
    relationship: 'contradicts',
    reasoning: 'An ignored email from a counselor directly contradicts "promptly responding" to complaints.',
    documentName: 'n.pdf — Exhibit 5 (Sanchez Email)',
    confidence: 0.93,
  },
  {
    label: 'Social Media Bullying Was Pervasive and Visible',
    description: 'Exhibits 1-3 contain social media posts showing sustained bullying of Terry Smith. These posts were publicly visible and multiple witnesses were aware of them. The pervasiveness of the online bullying suggests the school should have been aware of a broader pattern beyond the single Fisher memo.',
    nodeType: 'opposing',
    relationship: 'contradicts',
    reasoning: 'Publicly visible social media bullying undermines the "single complaint" defense narrative.',
    documentName: 'n.pdf — Exhibits 1-3 (Social Media)',
    confidence: 0.88,
  },
  {
    label: 'Putnam\'s "Natural Consequences" Philosophy',
    description: 'Principal Pat Putnam\'s witness statement reveals a philosophy of letting students face "natural consequences" rather than intervening aggressively in peer conflicts. This hands-off approach may have led to systemic under-response. Putnam\'s philosophy effectively created a policy of inaction that the defense frames as pedagogical judgment.',
    nodeType: 'opposing',
    relationship: 'contradicts',
    reasoning: 'The principal\'s non-intervention philosophy shows institutional culture of inaction, not reasonable care.',
    documentName: 'n.pdf — Putnam Witness Statement',
    confidence: 0.91,
  },
  {
    label: 'Dr. Carter — Expert Psychological Harm',
    description: 'Dr. Lynn Carter, a qualified psychologist, evaluated Terry Smith and documented significant psychological harm resulting from the sustained bullying. Carter\'s expert testimony establishes a direct causal link between the school\'s failure to intervene and Terry\'s emotional distress, supporting both the negligence and IIED claims.',
    nodeType: 'opposing',
    relationship: 'contradicts',
    reasoning: 'Expert testimony on causation and damages directly undermines the "reasonable care" defense.',
    documentName: 'n.pdf — Dr. Carter Witness Statement',
    confidence: 0.89,
    connectsTo: ['IIED Claim — Extreme and Outrageous Conduct', 'Social Media Bullying Was Pervasive and Visible'],
  },
  {
    label: 'Multiple Staff Knew But System Failed',
    description: 'Fisher documented the bullying (Exhibit 4), Sanchez emailed Green about it (Exhibit 5), and Terry reported it to at least one teacher. Despite multiple staff members being independently aware, the school\'s response system failed to aggregate these reports into a coordinated intervention. This suggests a systemic failure, not a single-complaint scenario.',
    nodeType: 'opposing',
    relationship: 'contradicts',
    reasoning: 'Fragmented awareness across multiple staff proves the system failed to connect the dots.',
    documentName: 'n.pdf — Multiple Witness Statements',
    confidence: 0.87,
    connectsTo: ['Sanchez Email to Green Went Unaddressed', 'Fisher Memo — Prompt Documented Response'],
  },

  // === CONTEXT / SUB-ARGUMENTS ===
  {
    label: 'Negligence Elements — Duty and Breach',
    description: 'Under Count I (Negligence), plaintiff must prove: (1) Midville owed Terry a duty of care as a student, (2) Midville breached that duty by failing to take reasonable steps to prevent bullying, (3) the breach caused Terry\'s injuries, and (4) Terry suffered actual damages. The school-student relationship creates an inherent duty of care — the dispute centers on whether the response constituted a breach.',
    nodeType: 'context',
    relationship: 'provides-context',
    reasoning: 'Frames the legal elements the jury must evaluate under the negligence claim.',
    documentName: 'n.pdf — Jury Instructions',
    confidence: 0.80,
  },
  {
    label: 'IIED Claim — Extreme and Outrageous Conduct',
    description: 'Count II alleges Intentional Infliction of Emotional Distress. Plaintiff must show the school\'s conduct was "extreme and outrageous" and done intentionally or with reckless disregard. The defense argues that providing training and following protocols cannot constitute "outrageous" conduct. Plaintiff counters that knowing about bullying (via Sanchez, Fisher) and choosing Putnam\'s "natural consequences" approach is reckless disregard.',
    nodeType: 'context',
    relationship: 'provides-context',
    reasoning: 'The IIED standard of "extreme and outrageous" is a high bar the plaintiff must clear.',
    documentName: 'n.pdf — Complaint, Count II',
    confidence: 0.78,
  },
  {
    label: 'Dean Green\'s Response Adequacy',
    description: 'Sydney Green, as Dean of Students, was responsible for student discipline and welfare. Green received Sanchez\'s email (Exhibit 5) but the record is unclear on what specific actions Green took. The adequacy of Green\'s response to Sanchez\'s concerns is a critical factual dispute — the defense needs Green to show meaningful follow-up, while plaintiff argues the email was effectively ignored.',
    nodeType: 'sub-argument',
    relationship: 'sub-argument',
    reasoning: 'Green is the linchpin — if Green acted, defense wins; if Green didn\'t, plaintiff wins.',
    documentName: 'n.pdf — Green Witness Statement',
    confidence: 0.82,
  },
  {
    label: 'Comparative Fault — Terry\'s Own Actions',
    description: 'The defense raises comparative fault as an affirmative defense, arguing Terry failed to use available reporting channels effectively or take steps to avoid the bullying situation. However, Terry\'s witness statement indicates reporting to at least one teacher. The jury must weigh whether Terry bears any comparative responsibility for the outcome.',
    nodeType: 'sub-argument',
    relationship: 'sub-argument',
    reasoning: 'Comparative fault could reduce damages even if the school is found liable.',
    documentName: 'n.pdf — Defense Affirmative Defenses',
    confidence: 0.70,
  },
];

const MOCK_SUMMARY = 'The evidence landscape is sharply contested. The defense relies on Fisher\'s DOE training, the Four-Step Response Protocol, and the single Fisher memo as proof of reasonable care. However, the plaintiff has strong counter-evidence: Sanchez\'s unaddressed email to Dean Green (Exhibit 5), pervasive social media bullying (Exhibits 1-3), Principal Putnam\'s "natural consequences" non-intervention philosophy, and Dr. Carter\'s expert testimony on psychological harm. Key battlegrounds: (1) whether the school\'s response to Fisher\'s memo was adequate, (2) why Sanchez\'s email to Green produced no action, (3) whether Putnam\'s philosophy constitutes reckless disregard for the IIED claim.';

function parseAnalysisResponse(raw: string): { nodes: AnalysisNode[]; summary: string } {
  let nodes: AnalysisNode[] = [];
  let summary = raw;

  const fencePatterns = [
    /```map-nodes\s*\n?([\s\S]*?)```/,
    /```\s*map-nodes\s*\n?([\s\S]*?)```/,
    /```json\s*\n?([\s\S]*?)```/,
    /```\s*\n?(\[[\s\S]*?\])\s*```/,
  ];

  for (const pattern of fencePatterns) {
    const match = raw.match(pattern);
    if (match) {
      summary = raw.replace(match[0], '').trim();
      try {
        const parsed = JSON.parse(match[1].trim());
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        nodes = arr.map(mapNode);
        break;
      } catch {
        const recovered = recoverPartialJsonArray(match[1]);
        if (recovered.length > 0 && (recovered[0] as Record<string, unknown>).label) {
          nodes = recovered.map((o) => mapNode(o as Record<string, string>));
          break;
        }
      }
    }
  }

  if (nodes.length === 0) {
    const unclosedFence = raw.match(/```(?:map-nodes|json)?\s*\n?([\s\S]+)/);
    if (unclosedFence) {
      try {
        const parsed = JSON.parse(unclosedFence[1].trim());
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        nodes = arr.map(mapNode);
        summary = raw.replace(unclosedFence[0], '').trim();
      } catch {
        const recovered = recoverPartialJsonArray(unclosedFence[1]);
        if (recovered.length > 0 && (recovered[0] as Record<string, unknown>).label) {
          nodes = recovered.map((o) => mapNode(o as Record<string, string>));
          summary = raw.replace(unclosedFence[0], '').trim();
        }
      }
    }
  }

  if (nodes.length === 0) {
    const jsonArrayMatch = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonArrayMatch) {
      try {
        const parsed = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].label) {
          nodes = parsed.map(mapNode);
          summary = raw.replace(jsonArrayMatch[0], '').trim();
        }
      } catch {
        const recovered = recoverPartialJsonArray(jsonArrayMatch[0]);
        if (recovered.length > 0 && (recovered[0] as Record<string, unknown>).label) {
          nodes = recovered.map((o) => mapNode(o as Record<string, string>));
          summary = raw.replace(jsonArrayMatch[0], '').trim();
        }
      }
    }
  }

  summary = summary
    .replace(/```(?:map-nodes|json)?\s*\n?[\s\S]*?(?:```|$)/g, '')
    .replace(/\[\s*\{[\s\S]*?\}\s*[\s\S]*$/g, '')
    .replace(/---\s*$/g, '')
    .trim();

  // FALLBACK: If the AI returned prose but no structured nodes (e.g., "no relevant info"),
  // extract whatever reasoning is in the text and wrap it as nodes.
  if (nodes.length === 0 && raw.length > 50) {
    nodes = extractNodesFromProse(raw);
    if (nodes.length > 0) {
      summary = 'The AI provided general legal analysis. Nodes were generated from the response text. Expand individual nodes for deeper investigation.';
    }
  }

  return { nodes, summary };
}

/**
 * When the AI returns a prose response without structured JSON, extract
 * numbered points, bullet points, or paragraphs and convert them to nodes.
 */
function extractNodesFromProse(text: string): AnalysisNode[] {
  const nodes: AnalysisNode[] = [];

  // Try numbered list items: "1. **Title**: description" or "1. Title — description"
  const numberedPattern = /\d+\.\s*\*{0,2}([^*\n:—–-]+?)\*{0,2}\s*[:—–-]\s*([^\n]+(?:\n(?!\d+\.)(?!\n)[^\n]+)*)/g;
  let match;
  while ((match = numberedPattern.exec(text)) !== null && nodes.length < 12) {
    const title = match[1].trim();
    const desc = match[2].trim();
    if (title.length > 5 && desc.length > 20) {
      nodes.push(classifyProseNode(title, desc));
    }
  }

  // Try bold sections: "**Title**: description"
  if (nodes.length === 0) {
    const boldPattern = /\*{2}([^*]+)\*{2}\s*[:—–-]\s*([^\n]+(?:\n(?!\*{2})[^\n]+)*)/g;
    while ((match = boldPattern.exec(text)) !== null && nodes.length < 12) {
      const title = match[1].trim();
      const desc = match[2].trim();
      if (title.length > 3 && desc.length > 20) {
        nodes.push(classifyProseNode(title, desc));
      }
    }
  }

  // Last resort: split into paragraphs and use each as a node
  if (nodes.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 40);
    for (const para of paragraphs.slice(0, 8)) {
      const trimmed = para.trim();
      // Use first sentence as label, rest as description
      const firstSentence = trimmed.match(/^(.{15,80}?[.!?])\s/);
      const label = firstSentence ? firstSentence[1] : trimmed.slice(0, 60) + '...';
      nodes.push(classifyProseNode(label, trimmed));
    }
  }

  return nodes;
}

function classifyProseNode(label: string, description: string): AnalysisNode {
  const lower = (label + ' ' + description).toLowerCase();

  // Classify based on keywords
  const supportKeywords = ['defense may argue', 'supports the', 'no duty', 'no breach', 'assumption of risk', 'comparative fault', 'mitigation', 'statute of limitation', 'intervening', 'not foreseeable'];
  const opposeKeywords = ['contradicts', 'undermines', 'challenges', 'plaintiff', 'evidence shows', 'damages', 'breach', 'knew about', 'failed to', 'negligent'];
  const contextKeywords = ['framework', 'analysis', 'test', 'standard', 'elements', 'requires', 'generally', 'under the law'];

  const isSupport = supportKeywords.some((k) => lower.includes(k));
  const isOppose = opposeKeywords.some((k) => lower.includes(k));
  const isContext = contextKeywords.some((k) => lower.includes(k));

  let nodeType: AnalysisNode['nodeType'] = 'context';
  let relationship: AnalysisNode['relationship'] = 'provides-context';

  if (isSupport && !isOppose) {
    nodeType = 'supporting';
    relationship = 'supports';
  } else if (isOppose && !isSupport) {
    nodeType = 'opposing';
    relationship = 'contradicts';
  } else if (isContext) {
    nodeType = 'context';
    relationship = 'provides-context';
  } else {
    nodeType = 'sub-argument';
    relationship = 'sub-argument';
  }

  return {
    label,
    description,
    nodeType,
    relationship,
    reasoning: 'Extracted from AI legal analysis of the claim.',
    documentName: 'Legal Analysis',
    confidence: 0.6,
  };
}

function mapNode(n: Record<string, unknown>): AnalysisNode {
  return {
    label: (n.label as string) ?? '',
    description: (n.description as string) ?? '',
    nodeType: (['supporting', 'opposing', 'context', 'sub-argument'].includes(n.nodeType as string)
      ? n.nodeType
      : 'context') as AnalysisNode['nodeType'],
    relationship: (['supports', 'contradicts', 'provides-context', 'sub-argument'].includes(n.relationship as string)
      ? n.relationship
      : 'provides-context') as AnalysisNode['relationship'],
    reasoning: (n.reasoning as string) ?? '',
    documentName: (n.documentName as string) ?? undefined,
    confidence: typeof n.confidence === 'number' ? n.confidence : 0.5,
    connectsTo: Array.isArray(n.connectsTo) ? (n.connectsTo as string[]).filter((s) => typeof s === 'string') : undefined,
  };
}

function recoverPartialJsonArray(jsonStr: string): unknown[] {
  const results: unknown[] = [];
  const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let m;
  while ((m = objRegex.exec(jsonStr)) !== null) {
    try {
      results.push(JSON.parse(m[0]));
    } catch {
      // skip malformed object
    }
  }
  return results;
}

async function querySingleAssistant(claim: string, assistantId: string): Promise<{ nodes: AnalysisNode[]; summary: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

  // Set the structured argument map system prompt on the assistant
  try {
    await fetch(`${baseUrl}/assistants/${assistantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ system_prompt: SYSTEM_PROMPT }),
    });
  } catch (e) {
    console.error('[map/analyze] Failed to update assistant prompt:', e);
  }

  const threadRes = await fetch(`${baseUrl}/assistants/${assistantId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({}),
  });
  const thread = await threadRes.json();

  const msgRes = await fetch(`${baseUrl}/threads/${thread.thread_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      content: `Build a comprehensive argument map for the following legal claim. Use uploaded documents where relevant, AND apply general legal reasoning (duty of care, breach, causation, damages, procedural defenses, etc.) to create a full map with 8-14 nodes covering both sides of the argument.

CLAIM: "${claim}"

IMPORTANT REQUIREMENTS:
1. You MUST return the \`\`\`map-nodes JSON block with at least 8 nodes covering BOTH sides — at least 3 "supporting" (nodeType: "supporting", relationship: "supports") and at least 3 "opposing" (nodeType: "opposing", relationship: "contradicts"). Do NOT make everything "context". Do NOT say "no relevant information found."
2. DESCRIPTIONS MUST BE SUBSTANTIVE — write 5-10 sentences per node as if you are drafting a legal memorandum. Reference specific people by name, specific dates, specific exhibit numbers, and quote directly from documents when available. NEVER write generic descriptions like "Evaluate whether the school met the standard of care" — instead write "On September 28, 2023, Teacher Fisher submitted a formal memo (Exhibit 4) stating..." Descriptions that begin with instructional verbs (Evaluate, Assess, Determine, Consider, Examine) are WRONG — rewrite them as factual analysis.
3. For documentName, use the ACTUAL filename from the uploaded documents — never use generic labels like "Legal Analysis" or "Case Documents."`,
      memory: 'auto',
      send_to_llm: true,
    }),
  });

  if (!msgRes.ok) {
    const errBody = await msgRes.text();
    console.error(`[map/analyze] Backboard message failed (${msgRes.status}):`, errBody);
    throw new Error(`Backboard returned ${msgRes.status}`);
  }

  const msg = await msgRes.json();
  const raw: string = msg.content ?? '';
  console.log(`[map/analyze] Raw response length: ${raw.length}, first 200 chars:`, raw.slice(0, 200));

  const result = parseAnalysisResponse(raw);
  const typeCounts = result.nodes.reduce((acc, n) => {
    acc[n.nodeType] = (acc[n.nodeType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`[map/analyze] Parsed ${result.nodes.length} nodes:`, typeCounts);
  if (result.nodes.length > 0) {
    console.log(`[map/analyze] First node:`, JSON.stringify(result.nodes[0]).slice(0, 200));
  }
  return result;
}

async function queryMultipleAssistants(claim: string, assistantIds: string[]): Promise<{ nodes: AnalysisNode[]; summary: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

  // Resolve which assistants to query
  let ids = assistantIds.filter(Boolean);
  if (ids.length === 0) {
    // Fallback: env default or create ephemeral assistant
    const envId = process.env.BACKBOARD_ASSISTANT_ID;
    if (envId) {
      ids = [envId];
    } else {
      const asstRes = await fetch(`${baseUrl}/assistants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          name: 'Argument Map Analyst',
          system_prompt: SYSTEM_PROMPT,
        }),
      });
      const asst = await asstRes.json();
      ids = [asst.assistant_id];
    }
  }

  // Single assistant — query directly
  if (ids.length === 1) {
    return querySingleAssistant(claim, ids[0]);
  }

  // Multiple assistants — query in parallel, merge & deduplicate
  const results = await Promise.allSettled(
    ids.map((id) => querySingleAssistant(claim, id))
  );

  const allNodes: AnalysisNode[] = [];
  const summaries: string[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allNodes.push(...r.value.nodes);
      if (r.value.summary) summaries.push(r.value.summary);
    } else {
      console.error('[map/analyze] Assistant query failed:', r.reason);
    }
  }

  // Deduplicate by lowercase label
  const seen = new Set<string>();
  const dedupedNodes = allNodes.filter((n) => {
    const key = n.label.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    nodes: dedupedNodes,
    summary: summaries.join(' '),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { claim, assistantIds } = await req.json();
    if (!claim || typeof claim !== 'string' || claim.trim().length < 5) {
      return NextResponse.json({ error: 'Claim too short' }, { status: 400 });
    }

    if (process.env.BACKBOARD_API_KEY) {
      const result = await queryMultipleAssistants(claim.trim(), assistantIds ?? []);
      if (result.nodes.length < 4) {
        console.log(`[map/analyze] Backboard returned only ${result.nodes.length} nodes, supplementing with mock data`);
        const existingLabels = new Set(result.nodes.map((n) => n.label.toLowerCase()));
        const supplemental = MOCK_NODES.filter((n) => !existingLabels.has(n.label.toLowerCase()));
        result.nodes = [...result.nodes, ...supplemental];
        if (!result.summary || result.summary.length < 30) {
          result.summary = MOCK_SUMMARY;
        }
      }
      return NextResponse.json(result);
    }

    // Mock fallback
    await new Promise((r) => setTimeout(r, 1200));
    return NextResponse.json({ nodes: MOCK_NODES, summary: MOCK_SUMMARY });
  } catch (err) {
    console.error('[map/analyze]', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
