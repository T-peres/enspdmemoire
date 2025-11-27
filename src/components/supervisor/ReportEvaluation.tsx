import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentReviewPanel } from './DocumentReviewPanel';
import { FinalVersionValidation } from './FinalVersionValidation';
import { IntermediateEvaluationForm } from './IntermediateEvaluationForm';
import { toast } from 'sonner';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Document } from '@/types/database';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  theme_id: string;
}

export function ReportEvaluation() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Charger les étudiants encadrés
      const { data: studentsData, error: studentsError } = await supabase
        .from('thesis_topics')
        .select(`
          student_id,
          profiles!thesis_topics_student_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('supervisor_id', profile.id)
        .not('student_id', 'is', null);

      if (studentsError) throw studentsError;

      const studentsList = studentsData
        ?.map((item: any) => ({
          id: item.profiles.id,
          first_name: item.profiles.first_name,
          last_name: item.profiles.last_name,
          theme_id: item.student_id,
        }))
        .filter((s: any) => s.id) || [];

      setStudents(studentsList);

      // Charger tous les documents des étudiants
      const studentIds = studentsList.map((s: Student) => s.id);
      
      if (studentIds.length > 0) {
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select(`
            *,
            profiles!documents_student_id_fkey (
              first_name,
              last_name
            )
          `)
          .in('student_id', studentIds)
          .order('submitted_at', { ascending: false });

        if (docsError) throw docsError;

        setDocuments(docsData || []);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      submitted: 'Soumis',
      under_review: 'En révision',
      approved: 'Approuvé',
      rejected: 'Rejeté',
      revision_requested: 'Révision demandée',
    };
    return labels[status] || status;
  };

  const filterDocuments = (type: string) => {
    let filtered = documents;
    
    if (selectedStudent) {
      filtered = filtered.filter(doc => doc.student_id === selectedStudent);
    }

    switch (type) {
      case 'pending':
        return filtered.filter(doc => doc.status === 'submitted');
      case 'reviewed':
        return filtered.filter(doc => ['approved', 'rejected', 'revision_requested'].includes(doc.status));
      case 'final':
        return filtered.filter(doc => doc.document_type === 'final_version');
      default:
        return filtered;
    }
  };

  const DocumentCard = ({ doc }: { doc: Document }) => {
    const isFinalVersion = doc.document_type === 'final_version';
    
    return (
      <div key={doc.id} className="mb-4">
        {isFinalVersion ? (
          <FinalVersionValidation document={doc} onValidated={loadData} />
        ) : (
          <DocumentReviewPanel document={doc} onReviewed={loadData} />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Évaluation des Rapports</CardTitle>
          <CardDescription>
            Consultez et évaluez les documents soumis par vos étudiants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length > 0 && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Filtrer par étudiant</label>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedStudent || ''}
                onChange={(e) => setSelectedStudent(e.target.value || null)}
              >
                <option value="">Tous les étudiants</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                Tous ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                En attente ({filterDocuments('pending').length})
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Évalués ({filterDocuments('reviewed').length})
              </TabsTrigger>
              <TabsTrigger value="final">
                Versions finales ({filterDocuments('final').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {filterDocuments('all').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun document à évaluer
                </p>
              ) : (
                filterDocuments('all').map((doc) => <DocumentCard key={doc.id} doc={doc} />)
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {filterDocuments('pending').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun document en attente
                </p>
              ) : (
                filterDocuments('pending').map((doc) => <DocumentCard key={doc.id} doc={doc} />)
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="mt-4">
              {filterDocuments('reviewed').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun document évalué
                </p>
              ) : (
                filterDocuments('reviewed').map((doc) => <DocumentCard key={doc.id} doc={doc} />)
              )}
            </TabsContent>

            <TabsContent value="final" className="mt-4">
              {filterDocuments('final').length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune version finale soumise
                </p>
              ) : (
                filterDocuments('final').map((doc) => <DocumentCard key={doc.id} doc={doc} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedStudent && students.find(s => s.id === selectedStudent) && (
        <Card>
          <CardHeader>
            <CardTitle>Évaluation Intermédiaire</CardTitle>
            <CardDescription>
              Créer une évaluation pour{' '}
              {students.find(s => s.id === selectedStudent)?.first_name}{' '}
              {students.find(s => s.id === selectedStudent)?.last_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntermediateEvaluationForm
              themeId={students.find(s => s.id === selectedStudent)?.theme_id || ''}
              studentId={selectedStudent}
              onSuccess={loadData}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
