import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook pour récupérer les statistiques du dashboard étudiant
 */
export function useStudentDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    overallProgress: 0,
    documentsSubmitted: 0,
    meetingsCount: 0,
    pendingActions: 0,
    unreadMessages: 0,
    plagiarismScore: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchStudentStats();
    }
  }, [profile]);

  const fetchStudentStats = async () => {
    try {
      setLoading(true);

      // Récupérer la fiche de suivi pour la progression
      const { data: ficheSuivi } = await supabase
        .from('fiche_suivi')
        .select('overall_progress')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Compter les documents soumis
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profile?.id);

      // Compter les rencontres
      const { count: meetingsCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profile?.id);

      // Compter les actions en attente (alertes actives)
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false);

      // Compter les messages non lus
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile?.id)
        .eq('is_read', false);

      // Récupérer le dernier score de plagiat
      const { data: plagiarismData } = await supabase
        .from('plagiarism_reports')
        .select('similarity_score')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setStats({
        overallProgress: ficheSuivi?.overall_progress || 0,
        documentsSubmitted: documentsCount || 0,
        meetingsCount: meetingsCount || 0,
        pendingActions: alertsCount || 0,
        unreadMessages: messagesCount || 0,
        plagiarismScore: plagiarismData?.similarity_score,
      });
    } catch (error) {
      console.error('Error fetching student stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchStudentStats };
}

/**
 * Hook pour récupérer les statistiques du dashboard encadreur
 */
export function useSupervisorDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    documentsToReview: 0,
    pendingMeetings: 0,
    alertsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchSupervisorStats();
    }
  }, [profile]);

  const fetchSupervisorStats = async () => {
    try {
      setLoading(true);

      // Récupérer les étudiants assignés
      const { data: assignments } = await supabase
        .from('supervisor_assignments')
        .select('student_id')
        .eq('supervisor_id', profile?.id)
        .eq('is_active', true);

      const studentIds = assignments?.map(a => a.student_id) || [];
      const totalStudents = studentIds.length;

      // Compter les thèmes par statut
      const { data: themes } = await supabase
        .from('themes')
        .select('status')
        .eq('supervisor_id', profile?.id);

      const pendingThemes = themes?.filter(t => t.status === 'pending').length || 0;
      const approvedThemes = themes?.filter(t => t.status === 'approved').length || 0;

      // Compter les documents à réviser
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .eq('status', 'pending');

      // Compter les fiches de suivi en attente de validation
      const { count: meetingsCount } = await supabase
        .from('fiche_suivi')
        .select('*', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .eq('validation_status', 'pending');

      // Compter les alertes
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false);

      setStats({
        totalStudents,
        pendingThemes,
        approvedThemes,
        documentsToReview: documentsCount || 0,
        pendingMeetings: meetingsCount || 0,
        alertsCount: alertsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching supervisor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchSupervisorStats };
}

/**
 * Hook pour récupérer les statistiques du dashboard chef de département
 */
export function useDepartmentHeadStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithSupervisor: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    pendingMeetings: 0,
    pendingDefenses: 0,
    completedDefenses: 0,
    avgProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.department_id) {
      fetchDepartmentStats();
    }
  }, [profile]);

  const fetchDepartmentStats = async () => {
    try {
      setLoading(true);
      const departmentId = profile?.department_id;

      // Récupérer tous les étudiants du département
      const { data: studentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');

      const studentIds = studentRoles?.map(r => r.user_id) || [];

      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .in('id', studentIds)
        .eq('department_id', departmentId);

      const deptStudentIds = students?.map(s => s.id) || [];
      const totalStudents = deptStudentIds.length;

      // Compter les étudiants avec encadreur
      const { data: assignments } = await supabase
        .from('supervisor_assignments')
        .select('student_id')
        .in('student_id', deptStudentIds)
        .eq('is_active', true);

      const studentsWithSupervisor = new Set(assignments?.map(a => a.student_id)).size;

      // Statistiques des thèmes
      const { data: themes } = await supabase
        .from('themes')
        .select('status')
        .in('student_id', deptStudentIds);

      const pendingThemes = themes?.filter(t => t.status === 'pending').length || 0;
      const approvedThemes = themes?.filter(t => t.status === 'approved').length || 0;

      // Fiches de suivi en attente
      const { count: pendingMeetings } = await supabase
        .from('fiche_suivi')
        .select('*', { count: 'exact', head: true })
        .in('student_id', deptStudentIds)
        .eq('validation_status', 'pending');

      // Soutenances
      const { data: defenses } = await supabase
        .from('defenses')
        .select('status')
        .in('student_id', deptStudentIds);

      const pendingDefenses = defenses?.filter(d => d.status === 'scheduled').length || 0;
      const completedDefenses = defenses?.filter(d => d.status === 'completed').length || 0;

      // Progression moyenne
      const { data: ficheSuivi } = await supabase
        .from('fiche_suivi')
        .select('overall_progress')
        .in('student_id', deptStudentIds);

      const avgProgress = ficheSuivi && ficheSuivi.length > 0
        ? ficheSuivi.reduce((sum, f) => sum + f.overall_progress, 0) / ficheSuivi.length
        : 0;

      setStats({
        totalStudents,
        studentsWithSupervisor,
        pendingThemes,
        approvedThemes,
        pendingMeetings: pendingMeetings || 0,
        pendingDefenses,
        completedDefenses,
        avgProgress,
      });
    } catch (error) {
      console.error('Error fetching department stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchDepartmentStats };
}

/**
 * Hook pour récupérer les statistiques du dashboard jury
 */
export function useJuryDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalTheses: 0,
    pendingEvaluations: 0,
    completedEvaluations: 0,
    scheduledDefenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchJuryStats();
    }
  }, [profile]);

  const fetchJuryStats = async () => {
    try {
      setLoading(true);

      // Récupérer les thèmes où je suis membre du jury
      const { data: juryMemberships } = await supabase
        .from('jury_members')
        .select('theme_id')
        .eq('member_id', profile?.id);

      const themeIds = juryMemberships?.map(jm => jm.theme_id) || [];
      const totalTheses = themeIds.length;

      // Compter les évaluations
      const { data: decisions } = await supabase
        .from('jury_decisions')
        .select('decision')
        .in('theme_id', themeIds);

      const pendingEvaluations = decisions?.filter(d => d.decision === 'pending').length || 0;
      const completedEvaluations = decisions?.filter(d => d.decision !== 'pending').length || 0;

      // Compter les soutenances programmées
      const { count: scheduledDefenses } = await supabase
        .from('defenses')
        .select('*', { count: 'exact', head: true })
        .in('theme_id', themeIds)
        .eq('status', 'scheduled');

      setStats({
        totalTheses,
        pendingEvaluations,
        completedEvaluations,
        scheduledDefenses: scheduledDefenses || 0,
      });
    } catch (error) {
      console.error('Error fetching jury stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchJuryStats };
}
