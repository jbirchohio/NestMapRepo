export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  job_type: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
  error?: string;
  data?: Record<string, unknown>;
  attempts?: number;
  max_attempts?: number;
  priority?: number;
  queue?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  progress?: number;
  output?: unknown;
  parent_id?: string;
  children_ids?: string[];
}
