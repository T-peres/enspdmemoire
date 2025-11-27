import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Archive } from '@/types/database';
import { toast } from 'sonner';

export function useArchives(studentId?: string) {
  return useQuery({
    queryKey: ['archives', studentId],
    queryFn: async () => {
      let query = supabase
        .from('archives')
        .select(`
          *,
          theme:themes(*),
          student:profiles!archives_student_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Archive[];
    },
  });
}

export function useArchive(themeId: string) {
  return useQuery({
    queryKey: ['archive', themeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archives')
        .select(`
          *,
          theme:themes(*),
          student:profiles!archives_student_id_fkey(*)
        `)
        .eq('theme_id', themeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Archive | null;
    },
    enabled: !!themeId,
  });
}

export function useCreateArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      themeId,
      studentId,
      finalDocumentPath,
      accessLevel = 'restricted',
    }: {
      themeId: string;
      studentId: string;
      finalDocumentPath: string;
      accessLevel?: string;
    }) => {
      // Calculer le checksum (simulation)
      const checksum = await calculateChecksum(finalDocumentPath);

      // Créer les métadonnées Dublin Core
      const metadata = {
        title: '',
        creator: '',
        subject: '',
        description: '',
        publisher: 'ENSPD',
        date: new Date().toISOString(),
        type: 'Text',
        format: 'application/pdf',
        identifier: themeId,
        language: 'fr',
      };

      const { data, error } = await supabase
        .from('archives')
        .insert({
          theme_id: themeId,
          student_id: studentId,
          final_document_path: finalDocumentPath,
          checksum,
          status: 'pending',
          access_level: accessLevel,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      toast.success('Archive créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating archive:', error);
      toast.error('Erreur lors de la création de l\'archive');
    },
  });
}

export function useUpdateArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      archiveId,
      updates,
    }: {
      archiveId: string;
      updates: Partial<Archive>;
    }) => {
      const { data, error } = await supabase
        .from('archives')
        .update(updates)
        .eq('id', archiveId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      toast.success('Archive mise à jour');
    },
    onError: (error) => {
      console.error('Error updating archive:', error);
      toast.error('Erreur lors de la mise à jour de l\'archive');
    },
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      archiveId,
      archivedBy,
    }: {
      archiveId: string;
      archivedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('archives')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: archivedBy,
        })
        .eq('id', archiveId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      toast.success('Document archivé avec succès');
    },
    onError: (error) => {
      console.error('Error archiving document:', error);
      toast.error('Erreur lors de l\'archivage du document');
    },
  });
}

export function usePublishArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      archiveId,
      accessLevel,
    }: {
      archiveId: string;
      accessLevel: string;
    }) => {
      const { data, error } = await supabase
        .from('archives')
        .update({
          published: true,
          published_at: new Date().toISOString(),
          access_level: accessLevel,
        })
        .eq('id', archiveId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      toast.success('Archive publiée avec succès');
    },
    onError: (error) => {
      console.error('Error publishing archive:', error);
      toast.error('Erreur lors de la publication de l\'archive');
    },
  });
}

// Fonction utilitaire pour calculer le checksum SHA-256
async function calculateChecksum(filePath: string): Promise<string> {
  // Dans une vraie application, cela calculerait le SHA-256 du fichier
  // Pour la simulation, on génère un hash aléatoire
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Fonction utilitaire pour convertir en PDF/A
export async function convertToPDFA(filePath: string): Promise<string> {
  // Dans une vraie application, cela appellerait un service de conversion
  // Pour la simulation, on retourne le même chemin avec un suffixe
  return `${filePath.replace('.pdf', '')}_pdfa.pdf`;
}
