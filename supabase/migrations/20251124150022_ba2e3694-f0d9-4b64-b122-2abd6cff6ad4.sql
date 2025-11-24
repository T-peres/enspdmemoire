-- =====================================================
-- POLYMEMOIRE PHASE 1: Schema Foundation
-- ENSPD - École Nationale Supérieure Polytechnique Douala
-- =====================================================

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('student', 'professor', 'department_head', 'admin', 'super_admin');

-- 2. Departments Table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert ENSPD departments
INSERT INTO public.departments (name, code, description) VALUES
  ('Génie Informatique & Télécommunications', 'GIT', 'Département Génie Informatique & Télécommunications'),
  ('Génie Électrique et Systèmes Intelligents', 'GESI', 'Département Génie Électrique et Systèmes Intelligents'),
  ('Génie de la Qualité Hygiène Sécurité et Environnement', 'GQHSE', 'Département Génie de la Qualité Hygiène Sécurité et Environnement'),
  ('Génie Automobile et Mécatronique', 'GAM', 'Département Génie Automobile et Mécatronique'),
  ('Génie Maritime et Portuaire', 'GMP', 'Département Génie Maritime et Portuaire'),
  ('Génie des Procédés', 'GP', 'Département Génie des Procédés'),
  ('Génie Énergétique', 'GE', 'Département Génie Énergétique'),
  ('Génie Mécanique', 'GM', 'Département Génie Mécanique'),
  ('Génie Physique', 'GPHY', 'Département Génie Physique'),
  ('Génie Civil', 'GC', 'Département Génie Civil');

-- 3. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  department_id UUID REFERENCES public.departments(id),
  avatar_url TEXT,
  matricule TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Roles Table (Security Critical - Separated from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 5. Security Definer Function for Role Checks (Prevents RLS Recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Thesis Topics Table
CREATE TABLE public.thesis_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  supervisor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'locked')),
  max_students INTEGER NOT NULL DEFAULT 1,
  current_students INTEGER NOT NULL DEFAULT 0,
  proposed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ
);

-- 7. Topic Selections Table (Manages Student Selections)
CREATE TABLE public.topic_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.thesis_topics(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(topic_id, student_id)
);

-- 8. Atomic Topic Selection Function (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION public.select_topic_atomic(
  p_student_id UUID,
  p_topic_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_students INTEGER;
  v_current_count INTEGER;
  v_topic_status TEXT;
BEGIN
  -- Lock the topic row to prevent concurrent modifications
  SELECT max_students, current_students, status 
  INTO v_max_students, v_current_count, v_topic_status
  FROM thesis_topics
  WHERE id = p_topic_id
  FOR UPDATE;

  -- Check if topic exists
  IF v_max_students IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sujet introuvable');
  END IF;

  -- Check if topic is approved
  IF v_topic_status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Ce sujet n''est pas encore approuvé');
  END IF;

  -- Check if student already has a confirmed selection
  IF EXISTS (
    SELECT 1 FROM topic_selections 
    WHERE student_id = p_student_id 
    AND status = 'confirmed'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Vous avez déjà sélectionné un sujet');
  END IF;

  -- Check if topic is full
  IF v_current_count >= v_max_students THEN
    RETURN json_build_object('success', false, 'error', 'Ce sujet est complet');
  END IF;

  -- Insert selection (idempotent with ON CONFLICT)
  INSERT INTO topic_selections (student_id, topic_id, status, selected_at)
  VALUES (p_student_id, p_topic_id, 'confirmed', NOW())
  ON CONFLICT (topic_id, student_id) 
  DO UPDATE SET status = 'confirmed', selected_at = NOW()
  WHERE topic_selections.status = 'pending';

  -- Update current_students count
  UPDATE thesis_topics
  SET current_students = current_students + 1,
      status = CASE 
        WHEN current_students + 1 >= max_students THEN 'locked'
        ELSE status
      END,
      locked_at = CASE 
        WHEN current_students + 1 >= max_students THEN NOW()
        ELSE locked_at
      END
  WHERE id = p_topic_id;

  RETURN json_build_object('success', true, 'message', 'Sujet sélectionné avec succès');
END;
$$;

-- 9. Updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_thesis_topics_updated_at BEFORE UPDATE ON public.thesis_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Profile Auto-Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thesis_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_selections ENABLE ROW LEVEL SECURITY;

-- Departments: Public read, admin write
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Profiles: Users can view all, edit own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- User Roles: View own, admins manage all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Thesis Topics: All authenticated can view, specific roles can create/manage
CREATE POLICY "Topics are viewable by authenticated users"
  ON public.thesis_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students and professors can propose topics"
  ON public.thesis_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    proposed_by = auth.uid() AND
    (public.has_role(auth.uid(), 'student') OR 
     public.has_role(auth.uid(), 'professor') OR
     public.has_role(auth.uid(), 'department_head') OR
     public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Department heads can manage topics in their department"
  ON public.thesis_topics FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'department_head') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin') OR
    supervisor_id = auth.uid()
  );

-- Topic Selections: Students manage own, others can view
CREATE POLICY "Users can view selections"
  ON public.topic_selections FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    public.has_role(auth.uid(), 'professor') OR
    public.has_role(auth.uid(), 'department_head') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students can create own selections"
  ON public.topic_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND
    public.has_role(auth.uid(), 'student')
  );

CREATE POLICY "Students can cancel own selections"
  ON public.topic_selections FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_profiles_department ON public.profiles(department_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_thesis_topics_department ON public.thesis_topics(department_id);
CREATE INDEX idx_thesis_topics_supervisor ON public.thesis_topics(supervisor_id);
CREATE INDEX idx_thesis_topics_status ON public.thesis_topics(status);
CREATE INDEX idx_topic_selections_student ON public.topic_selections(student_id);
CREATE INDEX idx_topic_selections_topic ON public.topic_selections(topic_id);
CREATE INDEX idx_topic_selections_status ON public.topic_selections(status);