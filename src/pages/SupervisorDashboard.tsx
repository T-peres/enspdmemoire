import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupervisorStats } from '@/components/supervisor/SupervisorStats';
import { StudentsList } from '@/components/supervisor/StudentsList';
import { MeetingForms } from '@/components/supervisor/MeetingForms';
import { ReportEvaluation } from '@/components/supervisor/ReportEvaluation';
import { SupervisorMessages } from '@/components/supervisor/SupervisorMessages';

export default function SupervisorDashboard() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tableau de bord Encadreur</h1>
          <p className="text-muted-foreground">
            Suivi et encadrement des étudiants - {profile?.first_name} {profile?.last_name}
          </p>
        </div>

        <SupervisorStats />

        <Tabs defaultValue="students" className="mt-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="students">Étudiants</TabsTrigger>
            <TabsTrigger value="meetings">Fiches de suivi</TabsTrigger>
            <TabsTrigger value="evaluation">Évaluation</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsList />
          </TabsContent>

          <TabsContent value="meetings">
            <MeetingForms />
          </TabsContent>

          <TabsContent value="evaluation">
            <ReportEvaluation />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Rapports</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Interface de consultation et commentaires des rapports étudiants</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <SupervisorMessages />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}