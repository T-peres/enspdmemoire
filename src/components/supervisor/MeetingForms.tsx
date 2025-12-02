import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MeetingReportForm } from './MeetingReportForm';
import { MeetingsList } from './MeetingsList';
import { Plus, History } from 'lucide-react';

interface MeetingFormsProps {
  themeId: string;
  studentId: string;
}

export function MeetingForms({ themeId, studentId }: MeetingFormsProps) {
  const [activeTab, setActiveTab] = useState('new');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMeetingCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('history');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Rencontres</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Rencontre
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="mt-4">
            <MeetingReportForm
              themeId={themeId}
              studentId={studentId}
              onSuccess={handleMeetingCreated}
            />
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <MeetingsList
              key={refreshKey}
              themeId={themeId}
              studentId={studentId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}