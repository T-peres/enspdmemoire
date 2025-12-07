import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupervisorStats } from '@/components/supervisor/SupervisorStats';
import { StudentsList } from '@/components/supervisor/StudentsList';
import { MeetingForms } from '@/components/supervisor/MeetingForms';
import { ReportEvaluation } from '@/components/supervisor/ReportEvaluation';
import { SupervisorMessages } from '@/components/supervisor/SupervisorMessages';
import { SupervisorAlertsComplete } from '@/components/supervisor/SupervisorAlertsComplete';
import { MeetingReportFormComplete } from '@/components/supervisor/MeetingReportFormComplete';
import { SupervisorDashboardHeader } from '@/components/supervisor/SupervisorDashboardHeader';
import { useSupervisorDashboardStats } from '@/hooks/useDashboardStats';
import { 
  Users, 
  FileText, 
  ClipboardCheck, 
  MessageSquare, 
  BookOpen,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const { stats } = useSupervisorDashboardStats();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* En-tête avec gradient */}
        <SupervisorDashboardHeader />

        {/* Centre d'alertes */}
        <div className="mb-6">
          <SupervisorAlertsComplete />
        </div>

        {/* Statistiques */}
        <div className="mb-8">
          <SupervisorStats />
        </div>

        {/* Navigation par onglets améliorée */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto p-2 bg-white shadow-lg rounded-xl">
            <TabsTrigger 
              value="overview" 
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">Vue d'ensemble</span>
            </TabsTrigger>
            <TabsTrigger 
              value="students"
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Étudiants</span>
            </TabsTrigger>
            <TabsTrigger 
              value="meetings"
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium">Rencontres</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs font-medium">Rapports</span>
            </TabsTrigger>
            <TabsTrigger 
              value="evaluation"
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-xs font-medium">Évaluation</span>
            </TabsTrigger>
            <TabsTrigger 
              value="messages"
              className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs font-medium">Messages</span>
            </TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Mes Étudiants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600 mb-2">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-600">Étudiants encadrés actuellement</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Voir la liste
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Fiches de Suivi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600 mb-2">{stats.pendingMeetings}</p>
                  <p className="text-sm text-gray-600">En attente de validation</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Nouvelle fiche
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600 mb-2">{stats.documentsToReview}</p>
                  <p className="text-sm text-gray-600">Documents en attente de révision</p>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Consulter
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
                <CardDescription>Accès rapide aux tâches courantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600">
                    <Calendar className="h-6 w-6" />
                    <span>Nouvelle Rencontre</span>
                  </Button>
                  <Button className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600">
                    <ClipboardCheck className="h-6 w-6" />
                    <span>Valider Fiche</span>
                  </Button>
                  <Button className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-purple-500 to-purple-600">
                    <FileText className="h-6 w-6" />
                    <span>Évaluer Rapport</span>
                  </Button>
                  <Button className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-orange-500 to-orange-600">
                    <MessageSquare className="h-6 w-6" />
                    <span>Envoyer Message</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Étudiants */}
          <TabsContent value="students">
            <StudentsList />
          </TabsContent>

          {/* Rencontres */}
          <TabsContent value="meetings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Gestion des Rencontres
                </CardTitle>
                <CardDescription>
                  Créer et gérer les fiches de rencontre avec vos étudiants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedStudent ? (
                  <MeetingReportFormComplete
                    themeId={selectedStudent.theme_id}
                    studentId={selectedStudent.id}
                    supervisorId={profile?.id || ''}
                    onSuccess={() => setSelectedStudent(null)}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      Sélectionnez un étudiant pour créer une fiche de rencontre
                    </p>
                    <Button onClick={() => {/* Ouvrir sélecteur d'étudiant */}}>
                      Sélectionner un étudiant
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <MeetingForms />
          </TabsContent>

          {/* Rapports */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Gestion des Rapports
                </CardTitle>
                <CardDescription>
                  Consulter, commenter et évaluer les rapports de vos étudiants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Interface de gestion des rapports</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Consultez les documents, ajoutez des commentaires et demandez des corrections
                  </p>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    En développement - Phase 2
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Évaluation */}
          <TabsContent value="evaluation">
            <ReportEvaluation />
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <SupervisorMessages />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}