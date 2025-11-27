// =====================================================
// TYPES TYPESCRIPT POUR LA BASE DE DONNÉES
// =====================================================

export type AppRole = 'student' | 'supervisor' | 'department_head' | 'jury' | 'admin';
export type ThemeStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';
export type DocumentType = 'plan' | 'chapter_1' | 'chapter_2' | 'chapter_3' | 'chapter_4' | 'final_version';
export type DocumentStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested';
export type PlagiarismStatus = 'pending' | 'in_progress' | 'passed' | 'failed';
export type JuryDecision = 'pending' | 'approved' | 'corrections_required' | 'rejected';
export type ArchiveStatus = 'pending' | 'archived' | 'published';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department_id?: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_at: string;
  assigned_by?: string;
}

export interface ThesisTopic {
  id: string;
  title: string;
  description?: string;
  department_id: string;
  supervisor_id?: string;
  proposed_by?: string;
  status: 'pending' | 'approved' | 'rejected' | 'locked';
  max_students: number;
  current_students: number;
  attachment_path?: string;
  created_at: string;
  updated_at: string;
  department?: Department;
  supervisor?: Profile;
}

export interface TopicSelection {
  id: string;
  student_id: string;
  topic_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  selected_at: string;
  confirmed_at?: string;
  topic?: ThesisTopic;
}

export interface SupervisorAssignment {
  id: string;
  student_id: string;
  supervisor_id: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
  student?: Profile;
  supervisor?: Profile;
}

export interface Theme {
  id: string;
  student_id: string;
  supervisor_id?: string;
  title: string;
  description: string;
  objectives?: string;
  methodology?: string;
  status: ThemeStatus;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  revision_notes?: string;
  version: number;
  previous_version_id?: string;
  created_at: string;
  updated_at: string;
  student?: Profile;
  supervisor?: Profile;
}

export interface Document {
  id: string;
  theme_id: string;
  student_id: string;
  document_type: DocumentType;
  title: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  status: DocumentStatus;
  version: number;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
  theme?: Theme;
  student?: Profile;
}

export interface FicheSuivi {
  id: string;
  theme_id: string;
  student_id: string;
  supervisor_id: string;
  
  plan_submitted: boolean;
  plan_approved: boolean;
  plan_comments?: string;
  plan_date?: string;
  
  chapter_1_progress: number;
  chapter_1_comments?: string;
  chapter_1_date?: string;
  
  chapter_2_progress: number;
  chapter_2_comments?: string;
  chapter_2_date?: string;
  
  chapter_3_progress: number;
  chapter_3_comments?: string;
  chapter_3_date?: string;
  
  chapter_4_progress: number;
  chapter_4_comments?: string;
  chapter_4_date?: string;
  
  overall_progress: number;
  quality_rating?: number;
  methodology_rating?: number;
  writing_quality_rating?: number;
  
  supervisor_validated: boolean;
  supervisor_validation_date?: string;
  department_head_validated: boolean;
  department_head_validation_date?: string;
  department_head_comments?: string;
  
  last_updated_by?: string;
  created_at: string;
  updated_at: string;
  
  theme?: Theme;
  student?: Profile;
  supervisor?: Profile;
}

export interface PlagiarismReport {
  id: string;
  document_id: string;
  theme_id: string;
  student_id: string;
  plagiarism_score?: number;
  status: PlagiarismStatus;
  report_file_path?: string;
  checked_at?: string;
  checked_by?: string;
  sources_found: number;
  details?: any;
  threshold_used: number;
  passed?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  document?: Document;
  theme?: Theme;
}

export interface JuryMember {
  id: string;
  theme_id: string;
  member_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
  member?: Profile;
}

export interface JuryDecisionData {
  id: string;
  theme_id: string;
  student_id: string;
  defense_date?: string;
  decision: JuryDecision;
  grade?: number;
  mention?: string;
  corrections_required: boolean;
  corrections_deadline?: string;
  corrections_description?: string;
  corrections_completed: boolean;
  corrections_validated_at?: string;
  corrections_validated_by?: string;
  deliberation_notes?: string;
  decided_at: string;
  created_at: string;
  updated_at: string;
  theme?: Theme;
  student?: Profile;
}

export interface Archive {
  id: string;
  theme_id: string;
  student_id: string;
  final_document_path: string;
  pdf_a_path?: string;
  file_size?: number;
  checksum?: string;
  status: ArchiveStatus;
  archived_at?: string;
  archived_by?: string;
  published: boolean;
  published_at?: string;
  access_level: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  theme?: Theme;
  student?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_entity_type?: string;
  related_entity_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  recipient_id: string;
  read: boolean;
  created_at: string;
  read_at?: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
  recipient?: {
    first_name: string;
    last_name: string;
  };
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
  updated_by?: string;
}

export interface StudentProgress {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  theme_id?: string;
  theme_title?: string;
  theme_status?: ThemeStatus;
  overall_progress?: number;
  supervisor_validated?: boolean;
  department_head_validated?: boolean;
  supervisor_id?: string;
  supervisor_first_name?: string;
  supervisor_last_name?: string;
}
