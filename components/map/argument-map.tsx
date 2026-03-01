'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  type OnSelectionChangeParams,
  MarkerType,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './map-animations.css';

import type { MapNodeData, MapEdgeData, AnalysisNode, AnalyzeResponse, ExpandResponse } from '@/types/argument-map';
import MapNodeComponent from './map-node';
import { ClaimInput } from './claim-input';
import { NodeDetailPanel } from './node-detail-panel';
import { MapToolbar } from './map-toolbar';

const nodeTypes = { mapNode: MapNodeComponent };

/* ─── Edge colors by relationship (softer palette) ─── */
const EDGE_COLORS: Record<string, string> = {
  supports: 'rgba(22,163,74,0.4)',
  contradicts: 'rgba(220,38,38,0.4)',
  'provides-context': 'rgba(217,119,6,0.35)',
  'sub-argument': 'rgba(124,58,237,0.35)',
};

const EDGE_MARKER_COLORS: Record<string, string> = {
  supports: '#16a34a',
  contradicts: '#dc2626',
  'provides-context': '#d97706',
  'sub-argument': '#7c3aed',
};

/* ─── Hardcoded mind map data (Terry Smith v. Midville) ─── */
// This creates a beautiful tree structure with multi-level branching

const HARDCODED_CLAIM = 'The Midville School District was negligent in failing to prevent the bullying of Terry Smith';

interface HardcodedNode {
  id: string;
  label: string;
  description: string;
  nodeType: MapNodeData['nodeType'];
  documentName?: string;
  confidence?: number;
  x: number;
  y: number;
}

interface HardcodedEdge {
  source: string;
  target: string;
  relationship: 'supports' | 'contradicts' | 'provides-context' | 'sub-argument';
  reasoning?: string;
  animated?: boolean;
  dashed?: boolean;
}

/*
 * Radial argument DAG — branches spread in all directions from the claim.
 * Each synthesis node occupies a quadrant, with evidence fanning outward.
 *
 *                          Sanchez    Dean Green
 *                             ↘          ↓
 *          DOE Training    School Knew ← Multi-Staff
 *               ↑              ↑              ↘
 *          Fisher Memo → Response    CLAIM    Putnam
 *               ↑        Adequate →    ↙  ↘      ↓
 *          Single Compl → Protocol  Harm Doc  Legal Framework
 *                              ↑       ↗  ↖      ↙        ↘
 *                         Dr. Carter  Social   IIED    Comp. Fault
 *                                     Media
 *                                       ↑
 *                                  Visible Posts
 */

const HARDCODED_NODES: HardcodedNode[] = [
  // ── CENTER ──
  { id: 'claim', label: HARDCODED_CLAIM, description: 'The central claim in Smith v. Midville School District (Case No. 2024-CV-03891) asserts that the Midville School District breached its duty of care by failing to take reasonable steps to prevent the sustained bullying of Terry Smith, a 14-year-old student. The plaintiff contends that school administrators and staff had actual knowledge of the bullying — through formal reports (Exhibit 4), counselor communications (Exhibit 5), and publicly visible social media harassment (Exhibits 1-3) — yet failed to implement any meaningful intervention. Under the applicable negligence standard, the district owed Terry a duty to provide a safe educational environment, and its inaction constituted a breach that proximately caused documented psychological harm.', nodeType: 'claim', x: 0, y: 0 },

  // ── UPPER-LEFT: "School Had Knowledge" branch (opposing) ──
  {
    id: 'school-knew', label: 'School Had Actual Knowledge',
    description: 'Three independent evidentiary lines converge to establish that Midville had actual — not merely constructive — knowledge of the bullying campaign against Terry Smith. First, Counselor Sanchez\'s October 12 email to Dean Green (Exhibit 5) explicitly described "ongoing peer harassment" and requested administrative intervention. Second, Dean Green\'s own witness statement acknowledges receiving the email but characterizes it as "routine counselor correspondence." Third, at least three staff members — Fisher, Sanchez, and PE teacher Rodriguez — were independently aware of incidents involving Terry, as documented in their respective witness depositions (Exhibits 9-11). Despite this convergent awareness, no staff meeting, incident report coordination, or parent notification occurred. Under Doe v. Board of Education (2019), actual knowledge by even one supervisory employee is sufficient to impute knowledge to the district.',
    nodeType: 'opposing', confidence: 0.94, x: -320, y: -220,
  },
  {
    id: 'sanchez-email', label: 'Sanchez Email to Dean Green',
    description: 'On October 12, 2023, school counselor Maria Sanchez sent an email to Dean Robert Green flagging concerns about Terry Smith (Exhibit 5). The email reads in relevant part: "I met with Terry Smith today. He reports persistent harassment from a group of students including name-calling, social exclusion, and what appears to be a coordinated social media campaign. He is visibly distressed and I believe administrative intervention is warranted." Exhibit 5 metadata confirms the email was opened by Green\'s account at 3:47 PM the same day. Green\'s calendar (Exhibit 5-A) shows no follow-up meetings scheduled with Terry, his parents, or the identified students. The defense has not produced any responsive email or documentation of action taken. This contemporaneous communication is among the strongest evidence of actual knowledge because it was written at the time of events — not reconstructed after litigation commenced — and was directed to the specific administrator responsible for student discipline.',
    nodeType: 'opposing', documentName: 'Exhibit 5 — Sanchez Email', confidence: 0.93, x: -520, y: -420,
  },
  {
    id: 'dean-green', label: 'Dean Green\'s Inaction',
    description: 'Dean Robert Green is the central figure in the knowledge-to-action gap. His witness deposition (Exhibit 8) presents a critical factual dispute: Green acknowledges receiving Sanchez\'s October 12 email (Exhibit 5) but claims he "assessed the situation and determined it did not rise to the level requiring formal intervention under Board Policy 5131.1." However, Green could not identify what assessment he performed, what criteria he applied, or who he consulted. His calendar (Exhibit 5-A) and email records (produced in discovery) show no follow-up with Sanchez, Terry, Terry\'s parents, or the accused students. Crucially, Board Policy 5131.1 (Exhibit 12) requires that "any report of bullying received by administration shall be documented on Form 5131.1-A within 48 hours" — no such form was ever completed. Green\'s inaction is not merely a gap in paperwork; it represents a conscious decision by the responsible administrator to disregard a specific, credible report of ongoing harassment.',
    nodeType: 'opposing', documentName: 'Exhibit 8 — Green Deposition', confidence: 0.82, x: -280, y: -440,
  },
  {
    id: 'multi-staff', label: 'Multiple Staff Were Aware',
    description: 'Beyond the Sanchez-Green communication chain, discovery has revealed that at least three additional staff members had independent knowledge of Terry\'s situation. Teacher Jennifer Fisher documented a classroom bullying incident in her formal memo (Exhibit 4) on September 28 — two weeks before Sanchez\'s email. PE teacher Carlos Rodriguez noted in his class journal (Exhibit 10) that Terry was being "excluded and mocked during team activities" on three separate occasions in October. Substitute teacher Allison Park submitted a written statement (Exhibit 11) describing an incident on November 3 where she witnessed students "openly taunting Terry in the hallway." None of these staff members were aware of each other\'s observations. The absence of any internal communication or coordination among these independently aware staff members demonstrates that the district had no functioning system for aggregating bullying reports — a systemic failure that allowed the harassment to continue unchecked for months despite widespread staff awareness.',
    nodeType: 'opposing', documentName: 'Exhibits 4, 9-11 — Staff Statements', confidence: 0.87, x: -80, y: -380,
  },

  // ── LEFT: "Response Was Adequate" branch (supporting / defense) ──
  {
    id: 'response-adequate', label: 'Defense: Response Was Adequate',
    description: 'The defense\'s primary argument, outlined in their Answer and Affirmative Defenses (Exhibit 13), contends that the Midville School District responded reasonably and in accordance with established policy. The defense points to three key facts: (1) Teacher Fisher identified a bullying incident and promptly filed a written memo with administration per the district\'s four-step anti-bullying protocol (Exhibit 4); (2) Fisher had completed mandatory Department of Education anti-bullying training in August 2023 (Exhibit 6 — DOE Certificate); and (3) the district\'s Board Policy 5131.1 (Exhibit 12) was in place and provided a clear framework for handling reports. The defense argues that a school district cannot guarantee zero bullying incidents, but rather must demonstrate that it took reasonable steps when incidents came to its attention. They characterize Fisher\'s memo as evidence of the system working as designed — a teacher saw something, documented it, and reported it through proper channels.',
    nodeType: 'supporting', confidence: 0.82, x: -380, y: 80,
  },
  {
    id: 'fisher-memo', label: 'Fisher Memo — Documented Response',
    description: 'On September 28, 2023, eighth-grade English teacher Jennifer Fisher submitted a formal written memorandum to the school administration (Exhibit 4) documenting a bullying incident she witnessed in her classroom. The memo states: "During fourth period on September 27, I observed a group of three students directing derogatory comments at Terry Smith regarding his appearance and social media presence. I intervened immediately, separated the students, and spoke with Terry privately after class. Terry appeared upset but declined to identify the students by name." Fisher\'s memo followed the format prescribed by the district\'s anti-bullying protocol (Exhibit 12, Appendix B) and was time-stamped as received by the main office on September 29. This document is the defense\'s strongest piece of evidence because it demonstrates that the district\'s reporting system was functional and that at least one teacher took affirmative action. However, the memo\'s strength is also its weakness for the defense — it proves the district had formal notice as early as September 28, yet no administrative action followed for the remainder of the fall semester.',
    nodeType: 'supporting', documentName: 'Exhibit 4 — Fisher Memo', confidence: 0.92, x: -600, y: -60,
  },
  {
    id: 'protocol', label: 'Four-Step Anti-Bullying Protocol',
    description: 'Board Policy 5131.1 (Exhibit 12) establishes the Midville School District\'s formal anti-bullying protocol, a four-step procedure: (1) Identify — staff members are trained to recognize bullying behaviors; (2) Document — incidents must be recorded on Form 5131.1-A within 48 hours; (3) Report — documentation is forwarded to the building dean for review; (4) Follow Up — the dean must contact parents of both the victim and the aggressor within five school days and implement a safety plan if warranted. The defense argues Fisher completed steps 1-3 (identified the behavior, documented it via her memo, and submitted it to administration). However, the protocol\'s own requirements expose the district\'s failure: no Form 5131.1-A was ever completed for Terry\'s case. No parent notification occurred. No safety plan was implemented. Step 4 — the most critical step, requiring administrative follow-through — was never initiated. The protocol\'s existence actually undercuts the defense by establishing a clear, mandatory standard that the district demonstrably failed to meet.',
    nodeType: 'supporting', documentName: 'Exhibit 12 — Board Policy 5131.1', confidence: 0.85, x: -620, y: 160,
  },
  {
    id: 'putnam', label: 'Putnam\'s "Natural Consequences" Philosophy',
    description: 'Principal Harold Putnam\'s deposition testimony (Exhibit 7) reveals a deeply problematic administrative philosophy that permeated the school\'s approach to peer conflicts. When asked about his response to bullying reports, Putnam stated: "In my thirty-two years of education, I\'ve found that students need to develop resilience. Peer conflict is a natural part of adolescent development, and the best approach is usually to let students work things out among themselves. Over-intervention by adults can actually make social dynamics worse." Putnam confirmed he applied this philosophy "consistently" and that he viewed Fisher\'s September 28 memo (Exhibit 4) as describing "a normal adolescent social conflict, not a bullying situation requiring formal intervention." This testimony is devastating to the defense for two reasons: first, it explains why the four-step protocol was never completed — the principal who would have overseen Step 4 ideologically opposed intervention. Second, it demonstrates willful indifference: Putnam didn\'t fail to act because he was unaware; he consciously chose not to act based on a personal philosophy that contradicted both Board Policy 5131.1 and DOE guidelines (Exhibit 6-A).',
    nodeType: 'opposing', documentName: 'Exhibit 7 — Putnam Deposition', confidence: 0.91, x: -560, y: 300,
  },
  {
    id: 'doe-training', label: 'DOE Anti-Bullying Training',
    description: 'Fisher\'s DOE training certificate (Exhibit 6) confirms she completed the mandatory "Recognizing and Responding to Bullying in Schools" course on August 14, 2023 — six weeks before the September 28 incident. The training materials (Exhibit 6-A) outline specific indicators of bullying, required documentation procedures, and escalation protocols that align with Midville\'s Board Policy 5131.1. The defense cites this training as evidence of institutional preparedness: the district invested in staff education and Fisher applied her training by recognizing and documenting the incident. However, the training materials also emphasize that "identification and documentation without administrative follow-through renders the reporting system ineffective." The training further states that "repeated or sustained bullying behavior requires immediate escalation to building administration and, in severe cases, to the district superintendent." Fisher\'s compliance with the training protocol actually highlights the gap — she did exactly what she was trained to do, but the system failed at the administrative level above her.',
    nodeType: 'supporting', documentName: 'Exhibit 6 — DOE Training Certificate', confidence: 0.90, x: -800, y: -140,
  },
  {
    id: 'single-complaint', label: 'Only One Formal Complaint Filed',
    description: 'A central pillar of the defense\'s argument (Exhibit 13, para. 34-38) is that only one formal bullying report — Fisher\'s September 28 memo (Exhibit 4) — was ever filed through official channels. The defense contends that a single incident report does not establish the "persistent pattern" required to trigger the district\'s enhanced intervention obligations under Board Policy 5131.1, Section IV. They argue that Sanchez\'s email to Green (Exhibit 5) was an informal communication, not a formal bullying report, and that the observations of other staff (Exhibits 10-11) were never submitted as incident reports. This argument has surface appeal but is legally vulnerable on several fronts. First, the district\'s own policy does not distinguish between "formal" and "informal" reports — it requires action on "any report of bullying received by administration." Second, the reason only one formal complaint was filed is precisely because the system for receiving and acting on complaints was broken. Third, under the "known or should have known" standard, the district cannot benefit from its own failure to aggregate information that was readily available to it.',
    nodeType: 'supporting', documentName: 'Exhibit 13 — Defense Answer', confidence: 0.75, x: -820, y: 100,
  },

  // ── LOWER-RIGHT: "Harm Was Documented" branch (opposing) ──
  {
    id: 'harm-documented', label: 'Harm Was Foreseeable & Documented',
    description: 'The damages element of the negligence claim is supported by two independent evidentiary lines that together establish both the foreseeability and the actuality of the harm suffered by Terry Smith. Dr. Sarah Carter\'s psychological evaluation (Exhibit 14) documents clinically significant anxiety, depression, and social withdrawal directly attributable to the bullying, with symptom onset correlating to the September-November 2023 period when the harassment intensified. Simultaneously, the social media evidence (Exhibits 1-3) demonstrates that the bullying was publicly visible and escalating over time — establishing that the harm was not only foreseeable but would have been apparent to any school administrator exercising ordinary care. Together, these evidence lines satisfy the damages element and support a finding that the school\'s inaction was a proximate cause of Terry\'s documented injuries, not merely a theoretical risk.',
    nodeType: 'opposing', confidence: 0.91, x: 280, y: 240,
  },
  {
    id: 'dr-carter', label: 'Dr. Carter — Expert Psychological Harm',
    description: 'Dr. Sarah Carter, a licensed clinical psychologist specializing in adolescent trauma, conducted a comprehensive psychological evaluation of Terry Smith over four sessions in January-February 2024 (Exhibit 14). Her 28-page report documents the following findings: (1) Terry meets DSM-5 diagnostic criteria for Generalized Anxiety Disorder (GAD) and Major Depressive Disorder, single episode, moderate severity; (2) Standardized testing (Beck Youth Inventories-II) placed Terry in the 94th percentile for anxiety and 89th percentile for depression relative to age-matched peers; (3) Terry experienced a measurable decline in academic performance — his GPA dropped from 3.6 to 2.1 between the first and second quarters of the 2023-24 school year (corroborated by Exhibit 15, school transcripts); (4) Terry reported persistent sleep disturbance, loss of appetite, and social isolation beginning in October 2023. Dr. Carter\'s causal opinion states: "Within a reasonable degree of psychological certainty, the sustained peer harassment and the school\'s failure to intervene were substantial contributing factors to Terry\'s current psychological condition." The defense has retained Dr. James Webb (Exhibit 16) to rebut, but his report concedes the diagnosis while disputing the causal attribution to school inaction.',
    nodeType: 'opposing', documentName: 'Exhibit 14 — Dr. Carter Evaluation', confidence: 0.89, x: 160, y: 440,
  },
  {
    id: 'social-media', label: 'Social Media Bullying Campaign',
    description: 'Exhibits 1 through 3 comprise 47 pages of screenshots, metadata reports, and platform activity logs documenting a coordinated social media harassment campaign against Terry Smith spanning September through November 2023. Exhibit 1 contains 23 Instagram posts and comments from the account "@midville_tea" featuring manipulated photos of Terry with derogatory captions. Exhibit 2 documents a Snapchat group titled "Terry the Loser" with 14 identified participants, including nine current Midville students. Exhibit 3 preserves a TikTok video viewed over 2,300 times in which two Midville students mock Terry by name in the school parking lot — with the school building clearly visible in the background. Platform metadata (Exhibit 3-A) confirms the posts were geotagged to Midville School District addresses. Multiple posts occurred during school hours from school IP addresses (confirmed by the district\'s own network logs, produced in discovery as Exhibit 17). The sustained, public, and escalating nature of this campaign — occurring partly on school grounds and during school hours — is central to establishing both foreseeability and the school\'s duty to intervene.',
    nodeType: 'opposing', documentName: 'Exhibits 1-3 — Social Media Evidence', confidence: 0.88, x: 420, y: 440,
  },
  {
    id: 'visible-posts', label: 'Posts Were Publicly Visible',
    description: 'A critical factual element is the public visibility of the social media harassment. Unlike private messaging or encrypted communications, the bullying of Terry Smith occurred on public-facing platforms accessible to anyone without login credentials. The Instagram account "@midville_tea" (Exhibit 1) was set to public — its posts could be viewed by any internet user, including school staff. The TikTok video (Exhibit 3) accumulated 2,300+ views and appeared in local feeds. Forensic analysis by plaintiff\'s digital evidence expert (Exhibit 18 — Henderson Report) confirms that seven of the Instagram posts appeared in the "Explore" feeds of accounts following Midville-related hashtags, meaning the content was algorithmically promoted to the local community. The defense cannot credibly argue that this was hidden, peer-to-peer communication. The school\'s own social media policy (Board Policy 7540, Exhibit 19) requires administrators to "monitor publicly available social media for content that affects the school environment" — an obligation the district plainly failed to fulfill.',
    nodeType: 'opposing', documentName: 'Exhibit 18 — Henderson Digital Report', confidence: 0.85, x: 480, y: 640,
  },

  // ── UPPER-RIGHT: "Legal Framework" branch (context) ──
  {
    id: 'legal-framework', label: 'Negligence Elements — Duty and Breach',
    description: 'Under Count I (Negligence), the plaintiff must prove four elements per the jury instructions (Exhibit 20): (1) the school owed Terry a duty of care as a student enrolled in the district; (2) the school breached that duty through action or inaction; (3) the breach was the proximate cause of Terry\'s injuries; and (4) Terry suffered actual, compensable damages. The duty element is largely undisputed — it is well-established in this jurisdiction that schools owe a duty of reasonable care to protect students from foreseeable harm, including peer-on-peer bullying, during school hours and school-supervised activities (see Morrison v. State Board of Education, citing Restatement (Third) of Torts §40). The breach element is the central battleground: the plaintiff argues the school had actual knowledge and did nothing, while the defense argues Fisher\'s memo demonstrates the system was functioning. The causation and damages elements are supported by Dr. Carter\'s expert testimony (Exhibit 14) and Terry\'s academic records (Exhibit 15). Comparative fault (the defense\'s primary affirmative defense) may reduce but not eliminate the damage award.',
    nodeType: 'context', documentName: 'Exhibit 20 — Jury Instructions', confidence: 0.80, x: 360, y: -180,
  },
  {
    id: 'iied', label: 'IIED Claim — Extreme and Outrageous Conduct',
    description: 'Count II alleges Intentional Infliction of Emotional Distress (IIED) against the Midville School District (Complaint, Exhibit 21, para. 45-58). IIED requires the plaintiff to prove: (1) the defendant acted intentionally or with reckless disregard; (2) the conduct was "extreme and outrageous" — exceeding all bounds of decency tolerated in a civilized society; (3) the conduct caused emotional distress; and (4) the distress was severe. This is a significantly higher bar than the negligence count. The "extreme and outrageous" standard is the critical hurdle — courts have historically been reluctant to find institutional inaction (as opposed to affirmative misconduct) sufficient to meet this standard. However, plaintiff argues that Putnam\'s deliberate non-intervention philosophy (Exhibit 7), combined with Dean Green\'s conscious disregard of Sanchez\'s email (Exhibit 5), crosses the line from mere negligence into reckless indifference. The strongest precedent is Taylor v. Lakewood School District (2021), where a court held that "a school administrator\'s deliberate policy of ignoring bullying reports, when the administrator knows of ongoing harassment, may constitute reckless disregard sufficient for an IIED claim."',
    nodeType: 'context', documentName: 'Exhibit 21 — Complaint, Count II', confidence: 0.78, x: 560, y: -320,
  },
  {
    id: 'comparative-fault', label: 'Comparative Fault — Terry\'s Own Actions',
    description: 'The defense\'s primary affirmative defense (Exhibit 13, para. 52-61) asserts comparative fault, arguing that Terry Smith contributed to his own harm by: (1) failing to report the bullying through the district\'s formal reporting channels (a student complaint form available in the main office and on the district website); (2) continuing to engage with social media platforms where the harassment occurred rather than blocking the accounts or deactivating his profiles; and (3) not informing his parents of the situation until November 2023, thereby depriving them of the opportunity to intervene earlier. However, Terry\'s own sworn statement (Exhibit 22) directly contradicts the first point: "I told Mr. Fisher about it in class, and I told Ms. Sanchez when she called me in. I thought they would help." This testimony, corroborated by Fisher\'s memo (Exhibit 4) and Sanchez\'s email (Exhibit 5), demonstrates that Terry did report through the adults available to him — the district cannot fault a 14-year-old for not navigating a bureaucratic complaint form when he reasonably relied on the teachers and counselors he trusted. Under the applicable comparative fault statute, Terry\'s recovery would be reduced by his percentage of fault, but given his age and the documented reports he did make, the defense\'s allocation argument is likely to find limited traction with a jury.',
    nodeType: 'sub-argument', documentName: 'Exhibit 22 — Terry Smith Statement', confidence: 0.70, x: 580, y: -100,
  },

  // ── MULTI-PARENT NODES — each draws from 2-3 other nodes ──
  {
    id: 'systemic-failure', label: 'Systemic Failure Pattern',
    description: 'When viewed collectively, the evidence from Sanchez\'s ignored email (Exhibit 5), Dean Green\'s failure to follow Board Policy 5131.1 (Exhibit 12), and Principal Putnam\'s deliberate non-intervention philosophy (Exhibit 7) reveal something more damaging to the defense than individual failures — they demonstrate a systemic institutional breakdown. This was not a case where one employee made a mistake; rather, three different administrators at three different levels of the school hierarchy all independently failed to protect Terry, and they did so for different reasons. Sanchez flagged the issue but lacked the authority to act. Green had the authority but chose not to exercise it. Putnam had both the authority and the knowledge but was ideologically opposed to intervention. The fact that the system failed at every level — identification (Fisher/Sanchez), escalation (Green), and oversight (Putnam) — transforms the defense narrative from "we responded reasonably" to "we had no functioning response system despite having a written policy." This pattern is particularly compelling under the "institutional negligence" standard articulated in Harris v. County School Board (2020), which holds that "a pattern of failures across multiple responsible employees may establish that the institution\'s policies were inadequate or unenforced."',
    nodeType: 'opposing', confidence: 0.93, x: -160, y: 160,
  },
  {
    id: 'foreseeability', label: 'Foreseeability Established',
    description: 'Foreseeability — a critical element in both the negligence and IIED claims — is established through the convergence of three independent evidence lines. First, the social media harassment campaign (Exhibits 1-3) was publicly visible, algorithmically promoted to local users (Exhibit 18 — Henderson Digital Report), and partially conducted on school grounds during school hours using school network connections (Exhibit 17 — district network logs). Any administrator exercising reasonable diligence — or even casually browsing local social media — would have encountered these posts. Second, Dr. Carter\'s expert report (Exhibit 14) establishes that the psychological harm Terry experienced was a predictable consequence of sustained, unaddressed bullying, consistent with decades of educational psychology research. Third, the awareness of multiple staff members (Exhibits 4, 5, 9-11) proves the school had actual notice — not merely constructive notice — that Terry was being targeted. Together, these three pillars demolish any defense argument that the harm was unforeseeable or that the school lacked sufficient information to act. Under the "known or should have known" standard, foreseeability is satisfied when either actual knowledge or constructive knowledge exists — here, the plaintiff can prove both.',
    nodeType: 'opposing', documentName: 'Exhibits 1-3, 14, 17-18', confidence: 0.90, x: 320, y: 60,
  },
  {
    id: 'policy-vs-practice', label: 'Policy Existed But Was Never Enforced',
    description: 'The defense\'s reliance on Board Policy 5131.1 (Exhibit 12) and Fisher\'s memo (Exhibit 4) as evidence of an adequate response creates a fundamental paradox that actually strengthens the plaintiff\'s case. The existence of a detailed four-step protocol proves the district knew bullying was a foreseeable risk requiring a structured response — yet the protocol\'s own mandatory requirements (Form 5131.1-A within 48 hours, parent notification within five school days, safety plan implementation) were never fulfilled for Terry\'s case. Fisher completed Steps 1-3, but Step 4 — the administrative follow-through that constituted the actual intervention — never occurred. Meanwhile, Principal Putnam\'s "natural consequences" philosophy (Exhibit 7) provides the explanation: the administrator responsible for Step 4 was ideologically opposed to the very intervention the policy required. Discovery also revealed that Form 5131.1-A had not been completed for any student in the prior two academic years (Exhibit 23 — document production log), suggesting the protocol was systemically unenforced, not just overlooked in Terry\'s case. The gap between written policy and actual practice is itself evidence of negligence — the district created expectations of protection that it had no intention of fulfilling.',
    nodeType: 'sub-argument', documentName: 'Exhibits 4, 7, 12, 23', confidence: 0.86, x: -700, y: 440,
  },
  {
    id: 'causation-chain', label: 'Direct Causation — Inaction to Injury',
    description: 'Establishing proximate causation — that the school\'s inaction was a direct cause of Terry\'s documented injuries — requires connecting the breach (failure to act on known bullying) to the harm (Terry\'s diagnosed psychological conditions). Dr. Carter\'s expert evaluation (Exhibit 14) provides the critical link: her report places the onset of Terry\'s anxiety and depressive symptoms in October 2023, correlating precisely with the period when the school had received Fisher\'s memo (September 28) and Sanchez\'s email (October 12) but taken no action. Dr. Carter\'s causal opinion states that "the absence of institutional intervention during the October-November 2023 period, when the harassment was escalating and the student had reported it to school personnel, was a substantial contributing factor in the severity and persistence of the resulting psychological harm." The documented decline in Terry\'s GPA from 3.6 to 2.1 (Exhibit 15) provides objective corroboration of the timeline. Combined with the established fact that the school had actual knowledge (via the Sanchez-Green email chain and Fisher\'s memo) and chose not to act, the causation chain is: knowledge → inaction → escalation → injury. The defense\'s retained expert, Dr. Webb (Exhibit 16), concedes the diagnosis but attributes causation to "pre-existing social difficulties" — a position undermined by Terry\'s clean academic and disciplinary record prior to September 2023 (Exhibit 15).',
    nodeType: 'opposing', documentName: 'Exhibits 14-16 — Expert Reports', confidence: 0.88, x: 60, y: 320,
  },
];

const HARDCODED_EDGES: HardcodedEdge[] = [
  // ── Synthesis → Claim ──
  { source: 'school-knew', target: 'claim', relationship: 'contradicts' },
  { source: 'response-adequate', target: 'claim', relationship: 'supports' },
  { source: 'harm-documented', target: 'claim', relationship: 'contradicts' },
  { source: 'legal-framework', target: 'claim', relationship: 'provides-context' },

  // ── Upper-left: evidence → "School Had Knowledge" ──
  { source: 'sanchez-email', target: 'school-knew', relationship: 'contradicts' },
  { source: 'dean-green', target: 'school-knew', relationship: 'contradicts' },
  { source: 'multi-staff', target: 'school-knew', relationship: 'contradicts' },

  // ── Left: evidence → "Response Was Adequate" ──
  { source: 'fisher-memo', target: 'response-adequate', relationship: 'supports' },
  { source: 'protocol', target: 'response-adequate', relationship: 'supports' },
  { source: 'putnam', target: 'response-adequate', relationship: 'contradicts', reasoning: 'Putnam\'s philosophy undermines the defense claim of adequate response' },

  // ── SHARED: Multi-Staff also feeds "Response Was Adequate" ──
  { source: 'multi-staff', target: 'response-adequate', relationship: 'contradicts', reasoning: 'Multiple staff knew but none coordinated — policy existed on paper only' },

  // ── Lower-right: evidence → "Harm Was Documented" ──
  { source: 'dr-carter', target: 'harm-documented', relationship: 'contradicts' },
  { source: 'social-media', target: 'harm-documented', relationship: 'contradicts' },

  // ── Upper-right: evidence → "Legal Framework" ──
  { source: 'iied', target: 'legal-framework', relationship: 'provides-context' },
  { source: 'comparative-fault', target: 'legal-framework', relationship: 'sub-argument' },

  // ── Deeper chains (evidence → evidence) ──
  { source: 'doe-training', target: 'fisher-memo', relationship: 'supports' },
  { source: 'visible-posts', target: 'social-media', relationship: 'contradicts' },
  { source: 'single-complaint', target: 'protocol', relationship: 'supports' },

  // ── MULTI-PARENT edges — each new node has 2-3 incoming sources ──

  // "Systemic Failure" ← Sanchez Email + Dean Green + Putnam (3 parents)
  { source: 'sanchez-email', target: 'systemic-failure', relationship: 'contradicts', reasoning: 'Sanchez\'s ignored email is one pillar of the systemic failure pattern' },
  { source: 'dean-green', target: 'systemic-failure', relationship: 'contradicts', reasoning: 'Green\'s inaction after receiving the email compounds the systemic failure' },
  { source: 'putnam', target: 'systemic-failure', relationship: 'contradicts', reasoning: 'Putnam\'s philosophy created the culture enabling the systemic failure' },
  // Systemic Failure feeds into claim
  { source: 'systemic-failure', target: 'claim', relationship: 'contradicts' },

  // "Foreseeability" ← Social Media + Dr. Carter + Multi-Staff (3 parents)
  { source: 'social-media', target: 'foreseeability', relationship: 'contradicts', reasoning: 'Publicly visible posts made the harm foreseeable to any reasonable observer' },
  { source: 'dr-carter', target: 'foreseeability', relationship: 'contradicts', reasoning: 'Expert testimony confirms the harm was predictable given the circumstances' },
  { source: 'multi-staff', target: 'foreseeability', relationship: 'contradicts', reasoning: 'Multiple staff awareness proves the school had actual notice' },
  // Foreseeability feeds into claim
  { source: 'foreseeability', target: 'claim', relationship: 'contradicts' },

  // "Policy vs Practice" ← Fisher Memo + Protocol + Putnam (3 parents)
  { source: 'fisher-memo', target: 'policy-vs-practice', relationship: 'supports', reasoning: 'Fisher\'s memo proves the policy existed and was initiated' },
  { source: 'protocol', target: 'policy-vs-practice', relationship: 'supports', reasoning: 'The four-step protocol was the formal policy on paper' },
  { source: 'putnam', target: 'policy-vs-practice', relationship: 'contradicts', reasoning: 'Putnam\'s philosophy ensured the policy was never meaningfully enforced' },

  // "Causation Chain" ← Dr. Carter + School Knew (2 parents)
  { source: 'dr-carter', target: 'causation-chain', relationship: 'contradicts', reasoning: 'Expert testimony establishes the injury element of causation' },
  { source: 'school-knew', target: 'causation-chain', relationship: 'contradicts', reasoning: 'School knowledge + inaction establishes the breach element' },
  // Causation feeds into harm-documented
  { source: 'causation-chain', target: 'harm-documented', relationship: 'contradicts' },

  // ── Cross-references (dashed, connecting across branches) ──
  { source: 'single-complaint', target: 'multi-staff', relationship: 'contradicts', dashed: true, reasoning: 'Defense says 1 complaint; plaintiff says multiple staff knew' },
  { source: 'dr-carter', target: 'iied', relationship: 'provides-context', dashed: true, reasoning: 'Expert testimony on harm supports IIED damages element' },
  { source: 'systemic-failure', target: 'policy-vs-practice', relationship: 'contradicts', dashed: true, reasoning: 'Systemic failure undermines any claim that policy was adequate' },
];

function buildHardcodedGraph(onExpand: (id: string) => void): { nodes: Node<MapNodeData>[]; edges: Edge<MapEdgeData>[] } {
  const nodes: Node<MapNodeData>[] = HARDCODED_NODES.map((hn) => ({
    id: hn.id,
    type: 'mapNode',
    position: { x: hn.x, y: hn.y },
    data: {
      label: hn.label,
      description: hn.description,
      nodeType: hn.nodeType,
      documentName: hn.documentName,
      confidence: hn.confidence,
      onExpand: hn.nodeType !== 'claim' ? onExpand : undefined,
      expanding: false,
    },
  }));

  const edges: Edge<MapEdgeData>[] = HARDCODED_EDGES.map((he, i) => ({
    id: `edge-${i}-${he.source}-${he.target}`,
    source: he.source,
    target: he.target,
    type: 'default',
    animated: !he.dashed,
    style: he.dashed
      ? { stroke: 'rgba(0,0,0,0.06)', strokeWidth: 0.5, strokeDasharray: '4 3' }
      : { stroke: EDGE_COLORS[he.relationship] ?? 'rgba(148,163,184,0.3)', strokeWidth: 1 },
    markerEnd: he.dashed
      ? undefined
      : { type: MarkerType.ArrowClosed, width: 6, height: 6, color: EDGE_MARKER_COLORS[he.relationship] ?? '#94a3b8' },
    data: {
      relationship: he.relationship,
      reasoning: he.reasoning ?? '',
    },
  }));

  return { nodes, edges };
}

/* ─── Cross-reference detection for dynamic nodes ─── */
function findCrossLink(a: AnalysisNode, b: AnalysisNode): string | null {
  const aText = `${a.label} ${a.description}`.toLowerCase();
  const bText = `${b.label} ${b.description}`.toLowerCase();
  const entities = [
    { keys: ['fisher', 'memo', 'exhibit 4'], label: 'Fisher memo' },
    { keys: ['sanchez', 'email', 'exhibit 5'], label: 'Sanchez email' },
    { keys: ['putnam', 'natural consequences', 'principal'], label: 'Putnam' },
    { keys: ['green', 'dean'], label: 'Dean Green' },
    { keys: ['carter', 'psycholog', 'expert'], label: 'Dr. Carter' },
    { keys: ['social media', 'exhibit 1', 'exhibit 2', 'exhibit 3'], label: 'Social media' },
    { keys: ['four-step', 'protocol', '4-step'], label: 'Protocol' },
    { keys: ['training', 'doe'], label: 'DOE training' },
    { keys: ['negligence', 'duty', 'breach'], label: 'Negligence' },
    { keys: ['iied', 'emotional distress', 'outrageous'], label: 'IIED' },
    { keys: ['comparative fault', "terry's own"], label: 'Fault' },
  ];
  for (const entity of entities) {
    const aHas = entity.keys.some((k) => aText.includes(k));
    const bHas = entity.keys.some((k) => bText.includes(k));
    if (aHas && bHas) return entity.label;
  }
  return null;
}

/* ─── Build radial DAG from flat API nodes ─── */
// Groups evidence by relationship, creates intermediate synthesis nodes,
// places each group in a different quadrant radiating from the claim.
interface LayeredGraph {
  nodes: Node<MapNodeData>[];
  edges: Edge<MapEdgeData>[];
}

// Quadrant angles (radians): upper-left, upper-right, lower-right, lower-left
const QUADRANT_ANGLES = [
  Math.PI * 1.25, // upper-left  (225°)
  Math.PI * 1.75, // upper-right (315°)
  Math.PI * 0.25, // lower-right (45°)
  Math.PI * 0.75, // lower-left  (135°)
];

function buildLayeredDAG(
  claim: string,
  analysisNodes: AnalysisNode[],
  onExpand: (id: string) => void,
): LayeredGraph {
  // Group nodes by relationship
  const groups: Record<string, { nodes: AnalysisNode[]; indices: number[] }> = {
    supports: { nodes: [], indices: [] },
    contradicts: { nodes: [], indices: [] },
    'provides-context': { nodes: [], indices: [] },
    'sub-argument': { nodes: [], indices: [] },
  };
  analysisNodes.forEach((n, i) => {
    const g = groups[n.relationship] ?? groups['provides-context'];
    g.nodes.push(n);
    g.indices.push(i);
  });

  // Build synthesis descriptions by combining child node content
  function synthesizeDescription(nodes: AnalysisNode[]): string {
    return nodes.map((n) => `${n.label}: ${n.description}`).join('\n\n');
  }

  // Determine which groups have nodes
  const activeGroups: { key: string; id: string; label: string; description: string; nodeType: MapNodeData['nodeType'] }[] = [];
  if (groups.supports.nodes.length > 0) activeGroups.push({ key: 'supports', id: 'synthesis-supports', label: 'Supporting Evidence', description: synthesizeDescription(groups.supports.nodes), nodeType: 'supporting' });
  if (groups.contradicts.nodes.length > 0) activeGroups.push({ key: 'contradicts', id: 'synthesis-contradicts', label: 'Opposing Evidence', description: synthesizeDescription(groups.contradicts.nodes), nodeType: 'opposing' });
  if (groups['provides-context'].nodes.length > 0) activeGroups.push({ key: 'provides-context', id: 'synthesis-context', label: 'Legal Context', description: synthesizeDescription(groups['provides-context'].nodes), nodeType: 'context' });
  if (groups['sub-argument'].nodes.length > 0) activeGroups.push({ key: 'sub-argument', id: 'synthesis-sub', label: 'Derivative Arguments', description: synthesizeDescription(groups['sub-argument'].nodes), nodeType: 'sub-argument' });

  const allNodes: Node<MapNodeData>[] = [];
  const allEdges: Edge<MapEdgeData>[] = [];

  // Claim node at center
  allNodes.push({
    id: 'claim-root',
    type: 'mapNode',
    position: { x: 0, y: 0 },
    data: { label: claim, description: claim, nodeType: 'claim' },
  });

  const synthRadius = 320;  // distance from claim to synthesis node
  const evidRadius = 280;   // distance from synthesis to evidence nodes
  let nodeCounter = 0;
  const nodeIdMap: Map<number, string> = new Map();

  activeGroups.forEach((ag, gIdx) => {
    const angle = QUADRANT_ANGLES[gIdx % QUADRANT_ANGLES.length];
    const group = groups[ag.key];
    const sx = synthRadius * Math.cos(angle);
    const sy = synthRadius * Math.sin(angle);

    // Synthesis node
    allNodes.push({
      id: ag.id,
      type: 'mapNode',
      position: { x: sx, y: sy },
      data: {
        label: ag.label,
        description: ag.description,
        nodeType: ag.nodeType,
        onExpand,
        expanding: false,
      },
    });

    // Edge: synthesis → claim
    allEdges.push({
      id: `edge-${ag.id}-claim`,
      source: ag.id,
      target: 'claim-root',
      type: 'default',
      animated: true,
      style: { stroke: EDGE_COLORS[ag.key] ?? 'rgba(148,163,184,0.3)', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 6, height: 6, color: EDGE_MARKER_COLORS[ag.key] ?? '#94a3b8' },
      data: { relationship: ag.key as MapEdgeData['relationship'], reasoning: '' },
    });

    // Fan evidence nodes outward from synthesis node
    const count = group.nodes.length;
    const fanSpread = Math.min(Math.PI * 0.6, count * 0.3); // wider fan for more nodes
    const startAngle = angle - fanSpread / 2;

    group.nodes.forEach((an, idx) => {
      nodeCounter++;
      const nodeId = `node-${nodeCounter}`;
      nodeIdMap.set(group.indices[idx], nodeId);

      const evAngle = count === 1 ? angle : startAngle + (fanSpread / (count - 1)) * idx;
      const ex = sx + evidRadius * Math.cos(evAngle);
      const ey = sy + evidRadius * Math.sin(evAngle);

      allNodes.push({
        id: nodeId,
        type: 'mapNode',
        position: { x: ex, y: ey },
        data: {
          label: an.label,
          description: an.description,
          nodeType: an.nodeType,
          documentName: an.documentName,
          confidence: an.confidence,
          onExpand,
          expanding: false,
        },
      });

      allEdges.push({
        id: `edge-${nodeId}-${ag.id}`,
        source: nodeId,
        target: ag.id,
        type: 'default',
        animated: true,
        style: { stroke: EDGE_COLORS[an.relationship] ?? 'rgba(148,163,184,0.3)', strokeWidth: 1 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 6, height: 6, color: EDGE_MARKER_COLORS[an.relationship] ?? '#94a3b8' },
        data: { relationship: an.relationship, reasoning: an.reasoning },
      });
    });
  });

  // Build label → nodeId lookup for connectsTo resolution
  const labelToNodeId = new Map<string, string>();
  for (const [idx, nodeId] of nodeIdMap.entries()) {
    const label = analysisNodes[idx].label.toLowerCase().trim();
    labelToNodeId.set(label, nodeId);
  }
  // Also include synthesis nodes
  for (const ag of activeGroups) {
    labelToNodeId.set(ag.label.toLowerCase().trim(), ag.id);
  }

  // Multi-parent edges from connectsTo field
  const connSeen = new Set<string>();
  for (let i = 0; i < analysisNodes.length; i++) {
    const an = analysisNodes[i];
    if (!an.connectsTo?.length) continue;
    const sourceId = nodeIdMap.get(i);
    if (!sourceId) continue;
    for (const targetLabel of an.connectsTo) {
      const targetId = labelToNodeId.get(targetLabel.toLowerCase().trim());
      if (!targetId || targetId === sourceId) continue;
      const key = [sourceId, targetId].sort().join('-');
      if (connSeen.has(key)) continue;
      connSeen.add(key);
      allEdges.push({
        id: `conn-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'default',
        style: { stroke: EDGE_COLORS[an.relationship] ?? 'rgba(148,163,184,0.2)', strokeWidth: 0.8, strokeDasharray: '6 3' },
        markerEnd: { type: MarkerType.ArrowClosed, width: 5, height: 5, color: EDGE_MARKER_COLORS[an.relationship] ?? '#94a3b8' },
        data: { relationship: an.relationship, reasoning: an.reasoning },
      });
    }
  }

  // Cross-reference edges (dashed) between evidence in different groups
  const seen = new Set<string>();
  for (let i = 0; i < analysisNodes.length; i++) {
    for (let j = i + 1; j < analysisNodes.length; j++) {
      if (analysisNodes[i].relationship === analysisNodes[j].relationship) continue;
      const link = findCrossLink(analysisNodes[i], analysisNodes[j]);
      if (link) {
        const idA = nodeIdMap.get(i);
        const idB = nodeIdMap.get(j);
        if (!idA || !idB) continue;
        const key = [idA, idB].sort().join('-');
        if (seen.has(key) || connSeen.has(key)) continue;
        seen.add(key);
        allEdges.push({
          id: `cross-${idA}-${idB}`,
          source: idA,
          target: idB,
          type: 'default',
          style: { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5, strokeDasharray: '4 3' },
          data: { relationship: 'provides-context' as const, reasoning: `Connected via: ${link}` },
        });
      }
    }
  }

  return { nodes: allNodes, edges: allEdges };
}

function expandLayout(parentX: number, parentY: number, count: number, angleFromCenter: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const radius = 200;
  const spread = Math.PI * 0.6;
  const startAngle = angleFromCenter - spread / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = count === 1 ? angleFromCenter : startAngle + (spread / (count - 1)) * i;
    return { x: parentX + radius * Math.cos(angle), y: parentY + radius * Math.sin(angle) };
  });
}

/* ─── Main Component ─── */
function ArgumentMapInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<MapNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<MapEdgeData>>([]);
  const [loading, setLoading] = useState(false);
  const [expandingNodeId, setExpandingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [currentClaim, setCurrentClaim] = useState(HARDCODED_CLAIM);
  const [currentAssistantIds, setCurrentAssistantIds] = useState<string[]>([]);
  const [indexedDocCount, setIndexedDocCount] = useState<number | null>(null);
  const { fitView } = useReactFlow();
  const nodeCounterRef = useRef(100);
  const initializedRef = useRef(false);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const handleExpand = useCallback(
    async (nodeId: string) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode || !currentClaim) return;

      setExpandingNodeId(nodeId);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: true } } : n)),
      );

      try {
        const res = await fetch('/api/map/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeLabel: targetNode.data.label,
            nodeDescription: targetNode.data.description,
            claim: currentClaim,
            assistantIds: currentAssistantIds,
          }),
        });
        const data: ExpandResponse = await res.json();
        if (!res.ok) throw new Error('Expand failed');

        const parentX = targetNode.position.x;
        const parentY = targetNode.position.y;
        const angleFromCenter = Math.atan2(parentY, parentX);
        const positions = expandLayout(parentX, parentY, data.nodes.length, angleFromCenter);

        const newNodes: Node<MapNodeData>[] = data.nodes.map((an, i) => {
          nodeCounterRef.current++;
          return {
            id: `node-${nodeCounterRef.current}`,
            type: 'mapNode',
            position: positions[i],
            data: {
              label: an.label,
              description: an.description,
              nodeType: an.nodeType,
              documentName: an.documentName,
              confidence: an.confidence,
              onExpand: handleExpand,
              expanding: false,
            },
          };
        });

        const newEdges: Edge<MapEdgeData>[] = newNodes.map((nn, i) => ({
          id: `edge-expand-${nodeId}-${nn.id}`,
          source: nodeId,
          target: nn.id,
          type: 'default',
          animated: true,
          style: { stroke: EDGE_COLORS[data.nodes[i].relationship] ?? 'rgba(148,163,184,0.3)', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 6, height: 6, color: EDGE_MARKER_COLORS[data.nodes[i].relationship] ?? '#94a3b8' },
          data: { relationship: data.nodes[i].relationship, reasoning: data.nodes[i].reasoning },
        }));

        // Multi-parent edges from connectsTo
        const connEdges: Edge<MapEdgeData>[] = [];
        const existingLabelToId = new Map<string, string>();
        for (const n of nodes) {
          existingLabelToId.set(n.data.label.toLowerCase().trim(), n.id);
        }
        // Also index new nodes
        for (const nn of newNodes) {
          existingLabelToId.set(nn.data.label.toLowerCase().trim(), nn.id);
        }

        const connSeen = new Set<string>();
        data.nodes.forEach((an, idx) => {
          if (!an.connectsTo?.length) return;
          const sourceId = newNodes[idx].id;
          for (const targetLabel of an.connectsTo) {
            const targetId = existingLabelToId.get(targetLabel.toLowerCase().trim());
            if (!targetId || targetId === sourceId) continue;
            const key = [sourceId, targetId].sort().join('-');
            if (connSeen.has(key)) continue;
            connSeen.add(key);
            connEdges.push({
              id: `conn-${sourceId}-${targetId}`,
              source: sourceId,
              target: targetId,
              type: 'default',
              style: { stroke: EDGE_COLORS[an.relationship] ?? 'rgba(148,163,184,0.2)', strokeWidth: 0.8, strokeDasharray: '6 3' },
              markerEnd: { type: MarkerType.ArrowClosed, width: 5, height: 5, color: EDGE_MARKER_COLORS[an.relationship] ?? '#94a3b8' },
              data: { relationship: an.relationship, reasoning: an.reasoning },
            });
          }
        });

        // Cross-link to existing nodes
        const existingAnalysisNodes = nodes
          .filter((n) => n.data.nodeType !== 'claim')
          .map((n) => ({ label: n.data.label, description: n.data.description, nodeType: n.data.nodeType as AnalysisNode['nodeType'], relationship: 'provides-context' as const, reasoning: '' }));
        const existingIds = nodes.filter((n) => n.data.nodeType !== 'claim').map((n) => n.id);

        const crossEdges: Edge<MapEdgeData>[] = [];
        data.nodes.forEach((newAn, newIdx) => {
          existingAnalysisNodes.forEach((existAn, existIdx) => {
            const link = findCrossLink(newAn, existAn);
            if (link) {
              const key = [newNodes[newIdx].id, existingIds[existIdx]].sort().join('-');
              if (connSeen.has(key)) return; // already connected via connectsTo
              crossEdges.push({
                id: `cross-${newNodes[newIdx].id}-${existingIds[existIdx]}`,
                source: newNodes[newIdx].id,
                target: existingIds[existIdx],
                type: 'default',
                style: { stroke: 'rgba(0,0,0,0.05)', strokeWidth: 0.5, strokeDasharray: '4 3' },
                data: { relationship: 'provides-context', reasoning: `Connected via: ${link}` },
              });
            }
          });
        });

        setNodes((nds) => [
          ...nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: false } } : n)),
          ...newNodes,
        ]);
        setEdges((eds) => [...eds, ...newEdges, ...connEdges, ...crossEdges]);
        setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 100);
      } catch (err) {
        console.error('[expand]', err);
      } finally {
        setExpandingNodeId(null);
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, expanding: false } } : n)),
        );
      }
    },
    [nodes, currentClaim, currentAssistantIds, setNodes, setEdges, fitView],
  );

  // Show demo only when no indexed documents exist; otherwise start with empty canvas
  useEffect(() => {
    if (initializedRef.current || indexedDocCount === null) return;
    initializedRef.current = true;
    if (indexedDocCount === 0) {
      // No real documents — show hardcoded demo as showcase
      const graph = buildHardcodedGraph(handleExpand);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setSummary('The evidence landscape is sharply contested. The defense relies on Fisher\'s DOE training, the Four-Step Protocol, and the single Fisher memo as proof of reasonable care. The plaintiff has strong counter-evidence: Sanchez\'s unaddressed email to Dean Green, pervasive social media bullying, Principal Putnam\'s non-intervention philosophy, and Dr. Carter\'s expert testimony on psychological harm.');
      setTimeout(() => fitView({ duration: 600, padding: 0.08 }), 200);
    }
    // indexedDocCount > 0: leave canvas empty — user will click "Analyze"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexedDocCount]);

  const handleAnalyze = useCallback(
    async (claim: string, assistantIds: string[]) => {
      setLoading(true);
      setCurrentClaim(claim);
      setCurrentAssistantIds(assistantIds);
      setSelectedNodeId(null);
      setSummary(null);

      try {
        const res = await fetch('/api/map/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claim, assistantIds }),
        });
        const data: AnalyzeResponse = await res.json();
        if (!res.ok) throw new Error('Analysis failed');

        const graph = buildLayeredDAG(claim, data.nodes, handleExpand);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setSummary(data.summary);
        setTimeout(() => fitView({ duration: 500, padding: 0.1 }), 150);
      } catch (err) {
        console.error('[analyze]', err);
      } finally {
        setLoading(false);
      }
    },
    [handleExpand, setNodes, setEdges, fitView],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [selectedNodeId, setNodes, setEdges],
  );

  const handleSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    if (sel.length === 1) setSelectedNodeId(sel[0].id);
    else if (sel.length === 0) setSelectedNodeId(null);
  }, []);

  // Manual edge drawing — user drags from one handle to another
  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'default',
            style: { stroke: 'rgba(148,163,184,0.25)', strokeWidth: 0.8, strokeDasharray: '6 3' },
            markerEnd: { type: MarkerType.ArrowClosed, width: 5, height: 5, color: '#94a3b8' },
            data: { relationship: 'provides-context' as const, reasoning: 'Manual connection' },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const handleNodeListClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    },
    [setNodes],
  );

  const handleResetLayout = useCallback(() => {
    if (indexedDocCount === 0) {
      const graph = buildHardcodedGraph(handleExpand);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setTimeout(() => fitView({ duration: 400, padding: 0.08 }), 50);
    } else {
      setNodes([]);
      setEdges([]);
      setSummary(null);
    }
  }, [handleExpand, setNodes, setEdges, fitView, indexedDocCount]);

  return (
    <div className="flex -m-8 h-[calc(100%+4rem)] relative">
      {/* Left panel */}
      <ClaimInput
        onAnalyze={handleAnalyze}
        loading={loading}
        nodes={nodes}
        onNodeClick={handleNodeListClick}
        selectedNodeId={selectedNodeId}
        summary={summary}
        onDocumentsLoaded={setIndexedDocCount}
      />

      {/* Center — React Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          minZoom={0.05}
          maxZoom={3}
          defaultEdgeOptions={{ type: 'default', animated: false }}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#fafbfc' }}
        >
          <Background gap={50} size={0.6} color="rgba(0,0,0,0.04)" />
          <MapToolbar onResetLayout={handleResetLayout} />
        </ReactFlow>

        {/* Minimal legend */}
        {nodes.length > 0 && (
          <div
            className="absolute top-4 left-4 z-10 flex items-center gap-4 rounded-full px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <LegendDot color="#16a34a" label="Supports" />
            <LegendDot color="#dc2626" label="Opposes" />
            <LegendDot color="#d97706" label="Context" />
            <LegendDot color="#7c3aed" label="Sub-arg" />
          </div>
        )}
      </div>

      {/* Full-screen detail overlay */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onExpand={handleExpand}
          onRemove={handleRemoveNode}
          expanding={expandingNodeId === selectedNodeId}
          claim={currentClaim}
          assistantIds={currentAssistantIds}
        />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export function ArgumentMap() {
  return (
    <ReactFlowProvider>
      <ArgumentMapInner />
    </ReactFlowProvider>
  );
}
