import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentStatus, DocumentType } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useDocuments(themeId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', themeId],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          theme:themes(id, title, status),
          student:profiles!documents_student_id_fkey(id, first_name, last_name)
        `)
        .order('submitted_at', { ascending: false });

      if (themeId) {
        query = query.eq('theme_id', themeId);
      } else {
        query = query.eq('student_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user && (!!themeId || true),
  });

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      themeId,
      documentType,
      title,
    }: {
      file: File;
      themeId: string;
      documentType: DocumentType;
      title: string;
    }) => {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${themeId}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Create document record
      const { data, error } = await supabase
        .from('documents')
        .insert([{
          theme_id: themeId,
          student_id: user?.id,
          document_type: documentType,
          title,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          status: 'submitted',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document téléchargé avec succès');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const reviewDocument = useMutation({
    mutationFn: async ({
      documentId,
      status,
      feedback,
    }: {
      documentId: string;
      status: DocumentStatus;
      feedback?: string;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          status,
          feedback,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Évaluation enregistrée');
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    documents,
    isLoading,
    uploadDocument,
    reviewDocument,
  };
}
