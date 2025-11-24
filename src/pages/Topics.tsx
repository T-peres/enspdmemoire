import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ThesisTopic, Department } from '@/types/database';
import { BookOpen, Users, Clock, CheckCircle, Lock, Search } from 'lucide-react';

export default function Topics() {
  const { hasRole, profile } = useAuth();
  const [topics, setTopics] = useState<ThesisTopic[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchDepartments();
    fetchTopics();
  }, []);

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Erreur lors du chargement des départements');
      return;
    }

    setDepartments(data || []);
  };

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('thesis_topics')
      .select(`
        *,
        department:departments(*),
        supervisor:profiles!supervisor_id(*)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erreur lors du chargement des sujets');
      return;
    }

    setTopics((data || []) as ThesisTopic[]);
    setLoading(false);
  };

  const handleSelectTopic = async (topicId: string) => {
    if (!profile) {
      toast.error('Profil non chargé');
      return;
    }

    setSelecting(topicId);

    try {
      const { data, error } = await supabase.rpc('select_topic_atomic', {
        p_student_id: profile.id,
        p_topic_id: topicId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (result.success) {
        toast.success(result.message || 'Sujet sélectionné avec succès !');
        fetchTopics(); // Refresh the list
      } else {
        toast.error(result.error || 'Une erreur est survenue');
      }
    } catch (error: any) {
      console.error('Selection error:', error);
      toast.error(error.message || 'Erreur lors de la sélection');
    } finally {
      setSelecting(null);
    }
  };

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || topic.department_id === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getStatusBadge = (topic: ThesisTopic) => {
    if (topic.status === 'locked' || topic.current_students >= topic.max_students) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Lock className="h-3 w-3" />
          Complet
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="h-3 w-3 text-success" />
        Disponible
        </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sujets de Mémoire</h1>
          <p className="text-muted-foreground">
            Explorez et sélectionnez votre sujet de mémoire parmi les propositions disponibles
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un sujet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topics Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des sujets...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun sujet disponible pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((topic) => (
              <Card key={topic.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary">{topic.department?.code}</Badge>
                    {getStatusBadge(topic)}
                  </div>
                  <CardTitle className="line-clamp-2">{topic.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {topic.description || 'Pas de description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {topic.current_students}/{topic.max_students} place(s)
                      </span>
                    </div>
                    {topic.supervisor && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Encadreur: {topic.supervisor.first_name} {topic.supervisor.last_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasRole('student') && (
                    <Button
                      onClick={() => handleSelectTopic(topic.id)}
                      disabled={
                        topic.status === 'locked' ||
                        topic.current_students >= topic.max_students ||
                        selecting === topic.id
                      }
                      className="w-full"
                    >
                      {selecting === topic.id ? 'Sélection...' : 'Sélectionner ce sujet'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
