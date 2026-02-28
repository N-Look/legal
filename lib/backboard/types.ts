export interface BackboardAssistant {
  id: string;
  name: string;
  created_at: string;
}

export interface BackboardThread {
  id: string;
  assistant_id: string;
  name: string;
  created_at: string;
}

export interface BackboardDocument {
  id: string;
  assistant_id: string;
  filename: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  created_at: string;
}

export interface BackboardUploadResponse {
  id: string;
  status: string;
}
