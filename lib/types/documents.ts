import type { DocType, BackboardStatus } from './database';

export interface UploadFormData {
  file?: File;
  rawText?: string;
  clientName: string;
  matterName?: string;
  docType: DocType;
}

export interface UploadResponse {
  documentId: string;
  sessionId: string;
  status: BackboardStatus;
}

export interface DocumentListFilters {
  clientId?: string;
  matterId?: string;
  docType?: DocType;
  pinnedOnly?: boolean;
  search?: string;
}

export type UploadPhase = 'idle' | 'validating' | 'uploading' | 'processing' | 'timeout' | 'complete' | 'error';
