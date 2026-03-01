import { NextRequest, NextResponse } from 'next/server';
import type { AnalysisNode } from '@/types/argument-map';

const SYSTEM_PROMPT = `You are a legal argument analyst helping a lawyer expand a specific point in their argument map. You have access to a knowledge base of uploaded legal documents.

Your job: Given a specific argument point and the overarching legal claim, dig deeper to find 2-5 related sub-points. You MUST ALWAYS return nodes — never say "no relevant information found."

Use THREE sources:
1. **Uploaded documents** — reference specific passages and filenames when available
2. **General legal principles** — apply relevant legal doctrines, tests, standards, and precedent reasoning
3. **Logical analysis** — break the point into sub-components, identify what needs to be proven, and explore counterarguments

IMPORTANT — always structure your response in this EXACT order:

1. FIRST, output a JSON block fenced with \`\`\`map-nodes
[...]
\`\`\`
containing an array of 2-5 evidence/argument objects. Each object must have:
- label (string, 5-10 words): short title
- description (string, 5-10 sentences MINIMUM): a thorough legal analysis written as if briefing a senior partner. NEVER write generic descriptions like "Evaluate whether..." or "Assess the extent to which..." — those are instructions, not analysis. Instead, write SUBSTANTIVE content: cite specific exhibit numbers and document names, quote key passages from witness statements or depositions, reference exact dates and names of people involved, explain the legal significance, identify how opposing counsel might attack or leverage this point. Every description should read like a paragraph from a legal memorandum, not a task description.
- nodeType (string): one of "supporting", "opposing", "context", or "sub-argument"
- relationship (string): one of "supports", "contradicts", "provides-context", or "sub-argument"
- reasoning (string, 1 sentence): why this connects to the point being expanded
- documentName (string): the SPECIFIC source document filename from the uploaded files. Use the actual filename — never use generic labels like "Legal Analysis" or "Case Documents."
- confidence (number 0-1): 0.8+ for document-backed, 0.5-0.8 for legal reasoning
- connectsTo (optional array of strings): labels of OTHER nodes in your response that this sub-point also logically connects to. Use when multiple pieces of evidence support the same conclusion.

CRITICAL RULES FOR DESCRIPTIONS:
- NEVER write descriptions that start with verbs like "Evaluate", "Assess", "Determine", "Analyze", "Consider", or "Examine" — those are instructions, not analysis.
- ALWAYS write descriptions that STATE FACTS and MAKE ARGUMENTS: "On October 12, Counselor Sanchez emailed..." not "Evaluate the counselor's communication..."
- ALWAYS reference specific people by name, specific dates, specific exhibit numbers, and specific document titles.
- If documents contain relevant quotes, include them directly in the description.
- Each description should be substantial enough to fill a full paragraph in a legal brief.

2. THEN, write a 1-sentence summary.

You MUST return the JSON block with at least 2 nodes. NEVER return an empty array or say you can't find relevant information. Use legal reasoning if documents don't directly address the point.`;

// Keyed by keywords found in the expanded node's label — Terry Smith v. Midville case
const MOCK_EXPANSIONS: Record<string, { nodes: AnalysisNode[]; summary: string }> = {
  training: {
    nodes: [
      {
        label: 'Fisher\'s DOE Training Certificate',
        description: 'Presley Fisher\'s CV (Exhibit 6) confirms completion of DOE-approved anti-bullying training. However, the training is a general certification — it does not specifically address the school\'s Four-Step Response Protocol or how to escalate persistent bullying beyond writing a memo.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'The training\'s scope matters — generic DOE training may not equal adequate institutional preparation.',
        documentName: 'n.pdf — Exhibit 6 (Fisher CV)',
        confidence: 0.82,
      },
      {
        label: 'No Evidence Other Staff Were Trained',
        description: 'While Fisher completed DOE training, there is no evidence in the case materials that Principal Putnam, Dean Green, or Counselor Sanchez received the same anti-bullying training. If only one teacher was trained, the "mandatory training" claim is overstated.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Mandatory training for one teacher is not the same as a school-wide trained response system.',
        documentName: 'n.pdf — Case Materials Review',
        confidence: 0.85,
      },
      {
        label: 'Training Did Not Prevent the Outcome',
        description: 'Even accepting that Fisher was properly trained, the bullying continued and Terry suffered documented psychological harm. Training effectiveness should be measured by outcomes, not just completion certificates. The training failed to prevent the harm it was designed to address.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Outcome-based analysis shows training alone was insufficient — the system still failed Terry.',
        documentName: 'n.pdf — Dr. Carter Statement',
        confidence: 0.88,
      },
    ],
    summary: 'Fisher\'s individual DOE training is documented, but the defense overstates its scope — no evidence other staff were trained, and the training did not prevent the harm.',
  },
  fisher: {
    nodes: [
      {
        label: 'Fisher Followed Protocol But Stopped Short',
        description: 'Fisher identified the bullying, documented it in a memo (Exhibit 4), and reported it to administration — completing steps 1-3 of the Four-Step Protocol. However, there is no evidence Fisher completed step 4 (follow-up). The memo appears to be the end of Fisher\'s involvement rather than the beginning of a resolution process.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Stopping at step 3 of a 4-step protocol means the protocol was not fully followed.',
        documentName: 'n.pdf — Fisher Witness Statement',
        confidence: 0.87,
      },
      {
        label: 'Fisher\'s Memo Confirms Severity of Bullying',
        description: 'Ironically, Fisher\'s memo (Exhibit 4) itself documents that the bullying was serious enough to warrant formal documentation. The defense cannot simultaneously use the memo as proof of "prompt response" while dismissing the severity of what the memo describes.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'The memo is a double-edged sword — it proves the school knew the bullying was serious.',
        documentName: 'n.pdf — Exhibit 4 (Fisher Memo)',
        confidence: 0.90,
      },
      {
        label: 'Fisher Was the Only Teacher Who Acted',
        description: 'Among all school staff, Fisher was the only one who created a formal written record. This supports the defense\'s "reasonable care" argument for Fisher individually, but highlights systemic failure — one teacher acting alone is not institutional reasonable care.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'Individual teacher action vs. institutional response is a critical distinction for the jury.',
        documentName: 'n.pdf — Witness Statements',
        confidence: 0.80,
      },
    ],
    summary: 'Fisher\'s memo is the defense\'s best evidence but also its biggest liability — it proves the school knew about serious bullying but the response stopped at documentation.',
  },
  protocol: {
    nodes: [
      {
        label: 'Protocol Step 4 (Follow-Up) Was Never Done',
        description: 'The Four-Step Response Protocol requires: (1) Identify, (2) Document, (3) Report, (4) Follow up. There is no evidence in the case materials that anyone completed step 4. The protocol existed on paper but was never fully executed, undermining the defense\'s reliance on it.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'An incomplete protocol execution is worse than no protocol — it shows awareness without action.',
        documentName: 'n.pdf — Defense Response',
        confidence: 0.88,
      },
      {
        label: 'Protocol Doesn\'t Address Online Bullying',
        description: 'Exhibits 1-3 show significant social media bullying against Terry. The Four-Step Response Protocol appears designed for in-school incidents. If the protocol has no provisions for online/social media bullying, it was inadequate for the actual threat Terry faced.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'A protocol that ignores the primary bullying vector (social media) is inherently inadequate.',
        documentName: 'n.pdf — Exhibits 1-3',
        confidence: 0.84,
      },
    ],
    summary: 'The protocol was never fully executed (Step 4 missing) and does not address the social media bullying documented in Exhibits 1-3.',
  },
  sanchez: {
    nodes: [
      {
        label: 'Sanchez Acted as Professional Counselor',
        description: 'Bays Sanchez, as school counselor, had professional obligations to report concerns about student welfare. Sanchez\'s email to Dean Green (Exhibit 5) was not just collegial concern — it was a professional counselor fulfilling their duty. This makes Green\'s non-response more significant.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'A counselor\'s formal report carries more weight than casual teacher concern.',
        documentName: 'n.pdf — Sanchez Witness Statement',
        confidence: 0.89,
      },
      {
        label: 'Sanchez Raised Concerns Repeatedly',
        description: 'Sanchez\'s witness statement indicates raising concerns about Terry multiple times, not just the single email (Exhibit 5). This pattern of repeated warnings that went unheeded strengthens the argument that the school had constructive knowledge of ongoing bullying.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Repeated warnings create a stronger constructive knowledge argument than a single complaint.',
        documentName: 'n.pdf — Sanchez Witness Statement',
        confidence: 0.86,
      },
      {
        label: 'Email Creates a Paper Trail Against Green',
        description: 'The Sanchez email (Exhibit 5) is a documented communication to a specific administrator (Dean Green) about a specific student (Terry). Even if Green claims not to have read it, the email creates a rebuttable presumption of receipt and knowledge that the defense must overcome.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Written email to the responsible administrator is strong evidence of institutional notice.',
        documentName: 'n.pdf — Exhibit 5',
        confidence: 0.91,
      },
    ],
    summary: 'Sanchez\'s email is devastating to the defense — a professional counselor\'s formal written report to the Dean that produced no documented response.',
  },
  social: {
    nodes: [
      {
        label: 'Social Media Posts Were Publicly Accessible',
        description: 'Exhibits 1-3 contain social media posts that were not private messages but publicly visible content. Multiple witnesses could see these posts. The school\'s claim of limited knowledge is weakened by the public nature of the bullying.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Public posts mean the school should have been aware even without formal reporting.',
        documentName: 'n.pdf — Exhibits 1-3',
        confidence: 0.86,
      },
      {
        label: 'Posts Show Pattern, Not Isolated Incident',
        description: 'Three separate exhibits of social media posts (Exhibits 1, 2, and 3) demonstrate an ongoing pattern of bullying, not a single isolated incident. The defense\'s characterization of "single documented complaint" ignores this documented pattern of online harassment.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Three separate exhibits of posts destroy the "single incident" narrative.',
        documentName: 'n.pdf — Exhibits 1-3',
        confidence: 0.90,
      },
    ],
    summary: 'The social media evidence (3 exhibits) shows a sustained public pattern that undermines the "single complaint" characterization.',
  },
  putnam: {
    nodes: [
      {
        label: 'Putnam\'s Philosophy Set Institutional Tone',
        description: 'As principal, Pat Putnam\'s "natural consequences" philosophy effectively set the school\'s approach to bullying. When the principal believes in non-intervention, subordinate staff (Green, Fisher) receive an implicit signal that aggressive anti-bullying action is not expected or valued.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'The principal\'s philosophy shapes institutional culture — non-intervention trickles down.',
        documentName: 'n.pdf — Putnam Witness Statement',
        confidence: 0.90,
      },
      {
        label: '"Natural Consequences" Is Not a Recognized Anti-Bullying Strategy',
        description: 'DOE-approved anti-bullying frameworks emphasize adult intervention, not allowing children to face "natural consequences" of peer aggression. Putnam\'s philosophy contradicts the very DOE training the defense relies upon, creating an internal inconsistency in the defense\'s case.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Putnam\'s philosophy directly contradicts the DOE training Midville claims to follow.',
        documentName: 'n.pdf — DOE Training Standards',
        confidence: 0.87,
      },
      {
        label: 'Putnam May Not Have Received Fisher\'s Memo',
        description: 'Fisher\'s memo was sent to "administration" but it is unclear whether Putnam personally reviewed it. If the principal was unaware of the formal complaint, this raises questions about the school\'s internal communication chain — another systemic failure.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'Whether Putnam saw the memo is a key factual question for establishing principal-level knowledge.',
        documentName: 'n.pdf — Fisher Memo / Putnam Statement',
        confidence: 0.75,
      },
    ],
    summary: 'Putnam\'s "natural consequences" philosophy contradicts DOE training and set an institutional tone of non-intervention that undermines the reasonable care defense.',
  },
  carter: {
    nodes: [
      {
        label: 'Carter\'s Qualifications Are Strong',
        description: 'Dr. Lynn Carter\'s CV (Exhibit 7) establishes strong qualifications in child/adolescent psychology. Carter\'s credentials make the expert testimony difficult for the defense to challenge on qualification grounds — the attack must focus on methodology or conclusions.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'A well-credentialed expert is harder to impeach, strengthening the causation argument.',
        documentName: 'n.pdf — Exhibit 7 (Carter CV)',
        confidence: 0.88,
      },
      {
        label: 'Carter Links Harm Directly to School Inaction',
        description: 'Dr. Carter\'s evaluation does not just document Terry\'s psychological harm — it draws a causal link between the school\'s failure to intervene and the severity of the emotional distress. This dual finding supports both the negligence causation element and the IIED emotional distress element.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Expert causation testimony is the strongest evidence connecting school inaction to Terry\'s harm.',
        documentName: 'n.pdf — Carter Witness Statement',
        confidence: 0.91,
      },
    ],
    summary: 'Dr. Carter provides well-credentialed expert testimony directly linking school inaction to Terry\'s psychological harm, supporting both claims.',
  },
  green: {
    nodes: [
      {
        label: 'Green Was Responsible for Student Discipline',
        description: 'As Dean of Students, Sydney Green had direct responsibility for student welfare and discipline. Receiving Sanchez\'s email (Exhibit 5) about bullying concerns and failing to act would constitute a failure in Green\'s core job function, not merely a missed communication.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Green\'s job title makes the non-response to Sanchez\'s email a dereliction of duty.',
        documentName: 'n.pdf — Green Witness Statement',
        confidence: 0.87,
      },
      {
        label: 'Green\'s Testimony May Be Evasive',
        description: 'Green\'s witness statement must address the Sanchez email. If Green claims not to have seen it, the jury must evaluate Green\'s credibility. If Green admits seeing it but claims to have taken action, Green must explain what that action was and why it didn\'t prevent continued harm.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'Green\'s credibility on the email response is a pivotal issue for the jury.',
        documentName: 'n.pdf — Green Witness Statement',
        confidence: 0.80,
      },
    ],
    summary: 'Green is the key administrator — the Dean of Students received a counselor\'s bullying report and must explain the non-response.',
  },
  negligence: {
    nodes: [
      {
        label: 'School-Student Duty Is Well Established',
        description: 'Schools owe students a duty of care as a matter of law. The in loco parentis doctrine means schools stand in the place of parents during school hours. Midville cannot argue "no duty" — the dispute is only about whether the duty was breached.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'The duty element is essentially conceded — schools always owe students a duty of care.',
        documentName: 'n.pdf — Jury Instructions',
        confidence: 0.95,
      },
      {
        label: 'Breach: Response vs. Reasonable Standard',
        description: 'A reasonable school faced with a teacher\'s bullying memo, a counselor\'s email, and social media evidence would have investigated, contacted parents, disciplined perpetrators, and monitored the situation. Midville did none of these. The gap between what a reasonable school would do and what Midville did constitutes breach.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'The gulf between reasonable response and actual response is the core breach argument.',
        documentName: 'n.pdf — Complaint, Count I',
        confidence: 0.89,
      },
      {
        label: 'Causation: "But For" the Inaction',
        description: 'But for Midville\'s failure to intervene after Fisher\'s memo and Sanchez\'s email, the bullying would likely have been stopped or reduced. Dr. Carter\'s expert testimony establishes that the prolonged duration of bullying directly caused the severity of Terry\'s psychological harm.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Expert testimony plus timeline evidence establishes but-for causation.',
        documentName: 'n.pdf — Carter Statement + Timeline',
        confidence: 0.86,
      },
    ],
    summary: 'The negligence claim is strong: duty is established by law, breach is shown by the gap between reasonable response and actual response, and expert testimony supports causation.',
  },
  iied: {
    nodes: [
      {
        label: 'Reckless Disregard May Satisfy Intent Element',
        description: 'IIED does not require specific intent to harm — reckless disregard for a known risk suffices. Knowing about bullying (Fisher memo, Sanchez email) and choosing not to act while the principal advocated "natural consequences" may constitute reckless disregard.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'The intent element can be met through reckless disregard, lowering the plaintiff\'s burden.',
        documentName: 'n.pdf — Jury Instructions, Count II',
        confidence: 0.82,
      },
      {
        label: '"Extreme and Outrageous" Is a High Standard',
        description: 'Courts require conduct that goes "beyond all possible bounds of decency." The defense will argue that providing training and having a protocol — even if imperfectly executed — cannot be "extreme and outrageous." This is the IIED claim\'s biggest hurdle.',
        nodeType: 'supporting',
        relationship: 'supports',
        reasoning: 'The high standard for "extreme and outrageous" conduct favors the defense on IIED.',
        documentName: 'n.pdf — Jury Instructions',
        confidence: 0.85,
      },
    ],
    summary: 'The IIED claim faces a high bar on "extreme and outrageous" conduct, though reckless disregard after knowledge may satisfy the intent element.',
  },
  fault: {
    nodes: [
      {
        label: 'Terry Reported to Fisher But Not Administration',
        description: 'Terry may have reported bullying to Fisher (resulting in the memo) but did not independently report to Green, Putnam, or other administrators. The defense argues Terry bears some fault for not escalating. However, Terry is a student — the burden of navigating bureaucracy should fall on adults.',
        nodeType: 'supporting',
        relationship: 'supports',
        reasoning: 'Comparative fault argument has limited force when the plaintiff is a student, not an adult.',
        documentName: 'n.pdf — Terry Witness Statement',
        confidence: 0.65,
      },
      {
        label: 'Students Have Reduced Capacity to Self-Advocate',
        description: 'Courts generally recognize that students — particularly those being bullied — have reduced capacity to navigate institutional complaint systems. Expecting a bullied student to independently escalate to the principal undermines the in loco parentis duty the school owes.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'The comparative fault defense is weakened when the plaintiff is a minor/student.',
        documentName: 'n.pdf — Legal Analysis',
        confidence: 0.83,
      },
    ],
    summary: 'Comparative fault is a weak defense here — students have reduced capacity to self-advocate, and the adults in the system already had knowledge.',
  },
  complaint: {
    nodes: [
      {
        label: 'Fisher Memo Was a Formal Complaint',
        description: 'Exhibit 4 (Fisher\'s memo) is a formal written complaint documenting bullying. The defense frames this as "prompt response" but it is also the documented complaint they claim was the "single" one. The question is what happened AFTER the memo was filed.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'The memo is simultaneously the defense\'s best evidence and proof of knowledge without adequate follow-through.',
        documentName: 'n.pdf — Exhibit 4',
        confidence: 0.88,
      },
      {
        label: 'Sanchez Email Was a Second Complaint',
        description: 'The defense says "single documented complaint" but Sanchez\'s email (Exhibit 5) is a separate, independent report to a different administrator. This makes at least two independent complaints — Fisher\'s memo to administration and Sanchez\'s email to Dean Green.',
        nodeType: 'opposing',
        relationship: 'contradicts',
        reasoning: 'Two independent reports from two different staff destroy the "single complaint" narrative.',
        documentName: 'n.pdf — Exhibit 5',
        confidence: 0.92,
      },
    ],
    summary: 'The "single complaint" characterization is factually wrong — Fisher\'s memo AND Sanchez\'s email are two independent complaints from two different staff members.',
  },
};

function findExpansion(nodeLabel: string): { nodes: AnalysisNode[]; summary: string } {
  const lower = nodeLabel.toLowerCase();
  for (const [key, expansion] of Object.entries(MOCK_EXPANSIONS)) {
    if (lower.includes(key)) return expansion;
  }
  // Default fallback
  return {
    nodes: [
      {
        label: 'Additional Documentary Evidence',
        description: 'Further review of the case files reveals additional documents that may be relevant to this specific point. A more thorough document-by-document analysis is recommended to identify all supporting and contradicting materials.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'General recommendation for deeper analysis of this specific point.',
        documentName: 'Case_File_Index.pdf',
        confidence: 0.55,
      },
      {
        label: 'Analogous Case Law Research Needed',
        description: 'This specific argument point would benefit from case law research to identify precedents in similar factual scenarios. Courts in this jurisdiction have addressed related issues, but the outcomes vary significantly based on specific facts.',
        nodeType: 'context',
        relationship: 'provides-context',
        reasoning: 'Legal research could strengthen or weaken this particular argument branch.',
        documentName: 'Legal_Research_Queue.pdf',
        confidence: 0.50,
      },
    ],
    summary: 'This point requires further investigation — additional documentary evidence and case law research may reveal stronger connections.',
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
      // skip
    }
  }
  return results;
}

function parseExpandResponse(raw: string): { nodes: AnalysisNode[]; summary: string } {
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

  // FALLBACK: If the AI returned prose without structured JSON, extract nodes from text
  if (nodes.length === 0 && raw.length > 50) {
    nodes = extractNodesFromProse(raw);
    if (nodes.length > 0) {
      summary = 'Generated from AI legal analysis. Expand further for deeper investigation.';
    }
  }

  return { nodes, summary };
}

function extractNodesFromProse(text: string): AnalysisNode[] {
  const nodes: AnalysisNode[] = [];

  const numberedPattern = /\d+\.\s*\*{0,2}([^*\n:—–-]+?)\*{0,2}\s*[:—–-]\s*([^\n]+(?:\n(?!\d+\.)(?!\n)[^\n]+)*)/g;
  let match;
  while ((match = numberedPattern.exec(text)) !== null && nodes.length < 5) {
    const title = match[1].trim();
    const desc = match[2].trim();
    if (title.length > 5 && desc.length > 20) {
      nodes.push(classifyProseNode(title, desc));
    }
  }

  if (nodes.length === 0) {
    const boldPattern = /\*{2}([^*]+)\*{2}\s*[:—–-]\s*([^\n]+(?:\n(?!\*{2})[^\n]+)*)/g;
    while ((match = boldPattern.exec(text)) !== null && nodes.length < 5) {
      const title = match[1].trim();
      const desc = match[2].trim();
      if (title.length > 3 && desc.length > 20) {
        nodes.push(classifyProseNode(title, desc));
      }
    }
  }

  if (nodes.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 40);
    for (const para of paragraphs.slice(0, 4)) {
      const trimmed = para.trim();
      const firstSentence = trimmed.match(/^(.{15,80}?[.!?])\s/);
      const label = firstSentence ? firstSentence[1] : trimmed.slice(0, 60) + '...';
      nodes.push(classifyProseNode(label, trimmed));
    }
  }

  return nodes;
}

function classifyProseNode(label: string, description: string): AnalysisNode {
  const lower = (label + ' ' + description).toLowerCase();
  const supportKeywords = ['defense may argue', 'supports the', 'no duty', 'no breach', 'assumption of risk', 'comparative fault', 'mitigation', 'statute of limitation', 'intervening', 'not foreseeable'];
  const opposeKeywords = ['contradicts', 'undermines', 'challenges', 'plaintiff', 'evidence shows', 'damages', 'breach', 'knew about', 'failed to', 'negligent'];

  const isSupport = supportKeywords.some((k) => lower.includes(k));
  const isOppose = opposeKeywords.some((k) => lower.includes(k));

  let nodeType: AnalysisNode['nodeType'] = 'context';
  let relationship: AnalysisNode['relationship'] = 'provides-context';

  if (isSupport && !isOppose) { nodeType = 'supporting'; relationship = 'supports'; }
  else if (isOppose && !isSupport) { nodeType = 'opposing'; relationship = 'contradicts'; }

  return { label, description, nodeType, relationship, reasoning: 'Extracted from AI legal analysis.', documentName: 'Legal Analysis', confidence: 0.6 };
}

async function querySingleAssistantExpand(
  nodeLabel: string,
  nodeDescription: string,
  claim: string,
  assistantId: string,
): Promise<{ nodes: AnalysisNode[]; summary: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

  // Set the structured expand system prompt on the assistant
  try {
    await fetch(`${baseUrl}/assistants/${assistantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ system_prompt: SYSTEM_PROMPT }),
    });
  } catch (e) {
    console.error('[map/expand] Failed to update assistant prompt:', e);
  }

  const threadRes = await fetch(`${baseUrl}/assistants/${assistantId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({}),
  });
  const thread = await threadRes.json();

  const content = `I am building an argument map for this legal claim:
"${claim}"

I need to dig deeper into this specific point:
**${nodeLabel}**
${nodeDescription}

Return 2-5 sub-points that expand on this specific argument. Include a MIX of nodeTypes — some "supporting" (relationship: "supports"), some "opposing" (relationship: "contradicts"), and optionally "context" or "sub-argument". Do NOT make everything the same type. Use uploaded documents where relevant, AND apply general legal reasoning. You MUST return the \`\`\`map-nodes JSON block with at least 2 nodes. Do NOT say "no relevant information found."

CRITICAL: Each node's "description" field must be 5-10 sentences of SUBSTANTIVE legal analysis — cite specific exhibit numbers, quote from documents, name specific people and dates, and explain legal significance. NEVER write generic descriptions like "Evaluate whether..." or "Assess the extent to which..." — those are instructions, not analysis. Write as if drafting a legal memorandum. For "documentName", use the ACTUAL filename from the uploaded documents, not generic labels.`;

  const msgRes = await fetch(`${baseUrl}/threads/${thread.thread_id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ content, memory: 'auto', send_to_llm: true }),
  });

  if (!msgRes.ok) {
    const errBody = await msgRes.text();
    console.error(`[map/expand] Backboard message failed (${msgRes.status}):`, errBody);
    throw new Error(`Backboard returned ${msgRes.status}`);
  }

  const msg = await msgRes.json();
  const raw: string = msg.content ?? '';
  console.log(`[map/expand] Raw response length: ${raw.length}, first 200 chars:`, raw.slice(0, 200));
  return parseExpandResponse(raw);
}

async function queryMultipleAssistantsExpand(
  nodeLabel: string,
  nodeDescription: string,
  claim: string,
  assistantIds: string[],
): Promise<{ nodes: AnalysisNode[]; summary: string }> {
  const apiKey = process.env.BACKBOARD_API_KEY!;
  const baseUrl = process.env.BACKBOARD_API_URL ?? 'https://app.backboard.io/api';

  // Resolve which assistants to query
  let ids = assistantIds.filter(Boolean);
  if (ids.length === 0) {
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

  if (ids.length === 1) {
    return querySingleAssistantExpand(nodeLabel, nodeDescription, claim, ids[0]);
  }

  // Multiple assistants — query in parallel, merge & deduplicate
  const results = await Promise.allSettled(
    ids.map((id) => querySingleAssistantExpand(nodeLabel, nodeDescription, claim, id))
  );

  const allNodes: AnalysisNode[] = [];
  const summaries: string[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allNodes.push(...r.value.nodes);
      if (r.value.summary) summaries.push(r.value.summary);
    } else {
      console.error('[map/expand] Assistant query failed:', r.reason);
    }
  }

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
    const { nodeLabel, nodeDescription, claim, assistantIds } = await req.json();
    if (!nodeLabel || !claim) {
      return NextResponse.json({ error: 'Missing nodeLabel or claim' }, { status: 400 });
    }

    if (process.env.BACKBOARD_API_KEY) {
      const result = await queryMultipleAssistantsExpand(nodeLabel, nodeDescription ?? '', claim, assistantIds ?? []);
      if (result.nodes.length < 2) {
        console.log(`[map/expand] Backboard returned only ${result.nodes.length} nodes, supplementing with mock data`);
        const expansion = findExpansion(nodeLabel);
        const existingLabels = new Set(result.nodes.map((n) => n.label.toLowerCase()));
        const supplemental = expansion.nodes.filter((n) => !existingLabels.has(n.label.toLowerCase()));
        result.nodes = [...result.nodes, ...supplemental];
        if (!result.summary || result.summary.length < 30) {
          result.summary = expansion.summary;
        }
      }
      return NextResponse.json(result);
    }

    // Mock fallback
    await new Promise((r) => setTimeout(r, 900));
    const expansion = findExpansion(nodeLabel);
    return NextResponse.json(expansion);
  } catch (err) {
    console.error('[map/expand]', err);
    return NextResponse.json({ error: 'Expansion failed' }, { status: 500 });
  }
}
