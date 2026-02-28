import { NextResponse } from 'next/server';

const JURISDICTION_LABELS: Record<string, string> = {
  ca: 'Federal (Canada)',
  ab: 'Alberta',
  bc: 'British Columbia',
  mb: 'Manitoba',
  nb: 'New Brunswick',
  nl: 'Newfoundland & Labrador',
  ns: 'Nova Scotia',
  nt: 'Northwest Territories',
  nu: 'Nunavut',
  on: 'Ontario',
  pe: 'Prince Edward Island',
  qc: 'Quebec',
  sk: 'Saskatchewan',
  yk: 'Yukon',
};

export interface CourtDatabase {
  databaseId: string;
  jurisdiction: string;
  jurisdictionLabel: string;
  name: string;
}

export interface GroupedCourts {
  jurisdiction: string;
  label: string;
  courts: CourtDatabase[];
}

// Fallback courts list for when CANLII_API_KEY is not set
const MOCK_COURTS: CourtDatabase[] = [
  { databaseId: 'csc-scc', jurisdiction: 'ca', jurisdictionLabel: 'Federal (Canada)', name: 'Supreme Court of Canada' },
  { databaseId: 'fca-caf', jurisdiction: 'ca', jurisdictionLabel: 'Federal (Canada)', name: 'Federal Court of Appeal' },
  { databaseId: 'fc-cf', jurisdiction: 'ca', jurisdictionLabel: 'Federal (Canada)', name: 'Federal Court' },
  { databaseId: 'onca', jurisdiction: 'on', jurisdictionLabel: 'Ontario', name: 'Court of Appeal for Ontario' },
  { databaseId: 'onsc', jurisdiction: 'on', jurisdictionLabel: 'Ontario', name: 'Ontario Superior Court of Justice' },
  { databaseId: 'onscdc', jurisdiction: 'on', jurisdictionLabel: 'Ontario', name: 'Ontario Superior Court of Justice — Divisional Court' },
  { databaseId: 'bcca', jurisdiction: 'bc', jurisdictionLabel: 'British Columbia', name: 'Court of Appeal for British Columbia' },
  { databaseId: 'bcsc', jurisdiction: 'bc', jurisdictionLabel: 'British Columbia', name: 'Supreme Court of British Columbia' },
  { databaseId: 'abca', jurisdiction: 'ab', jurisdictionLabel: 'Alberta', name: 'Court of Appeal of Alberta' },
  { databaseId: 'abkb', jurisdiction: 'ab', jurisdictionLabel: 'Alberta', name: 'Court of King\'s Bench of Alberta' },
  { databaseId: 'qcca', jurisdiction: 'qc', jurisdictionLabel: 'Quebec', name: 'Court of Appeal of Quebec' },
  { databaseId: 'qccs', jurisdiction: 'qc', jurisdictionLabel: 'Quebec', name: 'Superior Court of Quebec' },
];

export async function GET() {
  const apiKey = process.env.CANLII_API_KEY;

  let courts: CourtDatabase[];

  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.canlii.org/v1/caseBrowse/en/?api_key=${apiKey}`,
        { next: { revalidate: 86400 } } // cache for 24h
      );
      const data: Array<{ databaseId: string; jurisdiction: string; name: string }> =
        await res.json();
      courts = data.map((d) => ({
        databaseId: d.databaseId,
        jurisdiction: d.jurisdiction,
        jurisdictionLabel: JURISDICTION_LABELS[d.jurisdiction] ?? d.jurisdiction.toUpperCase(),
        name: d.name,
      }));
    } catch {
      courts = MOCK_COURTS;
    }
  } else {
    courts = MOCK_COURTS;
  }

  // Group by jurisdiction
  const grouped: Record<string, GroupedCourts> = {};
  for (const court of courts) {
    if (!grouped[court.jurisdiction]) {
      grouped[court.jurisdiction] = {
        jurisdiction: court.jurisdiction,
        label: court.jurisdictionLabel,
        courts: [],
      };
    }
    grouped[court.jurisdiction].courts.push(court);
  }

  // Sort: Federal first, then alphabetically
  const sorted = Object.values(grouped).sort((a, b) => {
    if (a.jurisdiction === 'ca') return -1;
    if (b.jurisdiction === 'ca') return 1;
    return a.label.localeCompare(b.label);
  });

  return NextResponse.json({ groups: sorted });
}
