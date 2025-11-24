export type AppRole = 'student' | 'professor' | 'department_head' | 'admin' | 'super_admin';

export type TopicStatus = 'pending' | 'approved' | 'rejected' | 'locked';

export type SelectionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department_id?: string;
  avatar_url?: string;
  matricule?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ThesisTopic {
  id: string;
  title: string;
  description?: string;
  department_id: string;
  supervisor_id?: string;
  status: TopicStatus;
  max_students: number;
  current_students: number;
  proposed_by?: string;
  created_at: string;
  updated_at: string;
  locked_at?: string;
  department?: Department;
  supervisor?: Profile;
}

export interface TopicSelection {
  id: string;
  topic_id: string;
  student_id: string;
  status: SelectionStatus;
  selected_at: string;
  topic?: ThesisTopic;
}
