import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { ThesisTopic, Department } from '@/types/database';
import { toast } from 'sonner';

export default function MyProposedTopics() {
  const { profile } = useAuth();
  const [topics, setTopics] = useState<ThesisTopic[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTopic, setEditingTopic] = useState<ThesisTopic | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    department_id: '',
    max_students: 1,
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      const [topicsRes, deptsRes] = await Promise.all([
        supabase
          .from('thesis_topics')
          .select('*, department:departments(*)')
          .eq('proposed_by', profile.id)
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('*').order('name')
      ]);

      if (topicsRes.error) throw topicsRes.error;
      if (deptsRes.error) throw deptsRes.error;

      setTopics(topicsRes.data as ThesisTopic[]);
      setDepartments(deptsRes.data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des données');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (topic: ThesisTopic) => {
    setEditingTopic(topic);
    setEditForm({
      title: topic.title,
      description: topic.description || '',
      department_id: topic.department_id,
      max_students: topic.max_students,
    });
  };

  const handleUpdate = async () => {
    if (!editingTopic) return;

    try {
      const { error } = await supabase
        .from('thesis_topics')
        .update({
          title: editForm.title,
          description: editForm.description,
          department_id: editForm.department_id,
          max_students: editForm.max_students,
        })
        .eq('id', editingTopic.id);

      if (error) throw error;

      toast.success('Sujet mis à jour avec succès');
      setEditingTopic(null);
      fetchData();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('thesis_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;

      toast.success('Sujet supprimé avec succès');
      fetchData();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
      console.error('Error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-warning text-warning">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="border-success text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-destructive text-destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      case 'locked':
        return (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            Complet
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Mes Sujets Proposés</h1>
            <p className="text-muted-foreground">
              Gérez les sujets de mémoire que vous avez proposés
            </p>
          </div>

          {topics.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore proposé de sujet
                </p>
                <Button onClick={() => window.location.href = '/topics'}>
                  Proposer un Sujet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {topics.map((topic) => (
                <Card key={topic.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary">
                            {topic.department?.code}
                          </Badge>
                          {getStatusBadge(topic.status)}
                          <Badge variant="outline">
                            {topic.current_students}/{topic.max_students} étudiants
                          </Badge>
                        </div>
                        <CardTitle className="text-xl mb-2">{topic.title}</CardTitle>
                        <CardDescription>{topic.description}</CardDescription>
                      </div>
                      
                      {topic.status === 'pending' && (
                        <div className="flex gap-2">
                          <Dialog open={editingTopic?.id === topic.id} onOpenChange={(open) => !open && setEditingTopic(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(topic)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Modifier le Sujet</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="title">Titre</Label>
                                  <Input
                                    id="title"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="description">Description</Label>
                                  <Textarea
                                    id="description"
                                    rows={4}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="department">Département</Label>
                                  <Select
                                    value={editForm.department_id}
                                    onValueChange={(value) => setEditForm({ ...editForm, department_id: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                          {dept.code} - {dept.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="max_students">Nombre max d'étudiants</Label>
                                  <Input
                                    id="max_students"
                                    type="number"
                                    min="1"
                                    value={editForm.max_students}
                                    onChange={(e) => setEditForm({ ...editForm, max_students: parseInt(e.target.value) })}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setEditingTopic(null)}>
                                    Annuler
                                  </Button>
                                  <Button onClick={handleUpdate}>
                                    Enregistrer
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(topic.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Proposé le {new Date(topic.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
