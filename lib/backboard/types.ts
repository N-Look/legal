export interface BackboardAssistant {
  assistant_id: string;
  name: string;
  created_at: string;
}

export interface BackboardThread {
  thread_id: string;
  created_at: string;
}

export interface BackboardDocument {
  document_id: string;
  filename: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  status_message?: string | null;
  summary?: string | null;
  chunk_count?: number | null;
  total_tokens?: number | null;
  file_size_bytes?: number | null;
  created_at: string;
}

export interface BackboardUploadResponse {
  document_id: string;
  filename: string;
  status: string;
}
