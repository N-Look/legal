export type DocType = 'brief' | 'transcript' | 'exhibit' | 'discovery' | 'memo' | 'other';
export type BackboardStatus = 'pending' | 'uploading' | 'processing' | 'indexed' | 'error';
export type UploadSessionStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error';

export interface Client {
  id: string;
  name: string;
  backboard_assistant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Matter {
  id: string;
  client_id: string;
  name: string;
  matter_number: string | null;
  backboard_thread_id: string | null;
  jurisdiction: string | null;
  court: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  client_id: string;
  matter_id: string | null;
  filename: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string | null;
  doc_type: DocType;
  backboard_document_id: string | null;
  backboard_assistant_id: string | null;
  backboard_status: BackboardStatus;
  is_raw_text: boolean;
  storage_path: string | null;
  pinned_to_matter: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: string;
  document_id: string;
  status: UploadSessionStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
