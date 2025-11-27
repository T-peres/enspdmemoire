import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentStats } from '@/components/student/StudentStats';
import { ThemeSelection } from '@/components/student/ThemeSelection';
import { ReportSubmission } from '@/components/student/ReportSubmission';
import { MeetingHistory } from '@/components/student/MeetingHistory';
import { StudentMessages } from '@/components/student/StudentMessages';
import { StudentProfile } from '@/components/student/StudentProfile';

export default function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mon Mémoire</h1>
          <p className="text-muted-foreground">
            Gestion de votre projet de mémoire - {profile?.first_name} {profile?.last_name}
          </p>
        </div>

        <StudentStats />

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="theme">Sujet</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="meetings">Rencontres</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="profile">Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StudentStats />
          </TabsContent>

          <TabsContent value="theme">
            <ThemeSelection />
          </TabsContent>

          <TabsContent value="reports">
            <ReportSubmission />
          </TabsContent>

          <TabsContent value="meetings">
            <MeetingHistory />
          </TabsContent>

          <TabsContent value="messages">
            <StudentMessages />
          </TabsContent>

          <TabsContent value="profile">
            <StudentProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}