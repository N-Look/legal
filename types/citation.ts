export type CitationStatus = 'resolved' | 'ambiguous' | 'unresolved' | 'pending';
export type CitationType = 'case' | 'statute' | 'regulation' | 'exhibit';

export interface Citation {
  id: string;
  raw: string;
  caseName: string;
  reporter: string;
  year: string;
  pinCite?: string;
  type: CitationType;
  status: CitationStatus;
  passage?: string;
  source?: string;
  sourceUrl?: string;
  confidence?: number;
}

export interface AuthorityPack {
  matter: string;
  generatedAt: string;
  citations: Citation[];
  summary: {
    resolved: number;
    ambiguous: number;
    unresolved: number;
  };
}
