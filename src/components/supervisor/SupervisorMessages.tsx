import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Mail, MailOpen, Inbox, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/types/database';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

export function SupervisorMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [formData, setFormData] = useState({
    recipient_id: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    if (profile) {
      loadStudents();
      loadMessages();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedStudent) {
      loadMessages(selectedStudent);
    } else {
      loadMessages();
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      const studentsList = data
        ?.map((item: any) => ({
          id: item.profiles.id,
          first_name: item.profiles.first_name,
          last_name: item.profiles.last_name,
        }))
        .filter((s: any) => s.id) || [];

      setStudents(studentsList);
    } catch (error: any) {
      console.error('Error loading students:', error);
    }
  };

  const loadMessages = async (studentId?: string) => {
    if (!profile) return;

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name),
          recipient:profiles!messages_recipient_id_fkey(first_name, last_name)
        `);

      if (studentId) {
        query = query.or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${studentId}),and(sender_id.eq.${studentId},recipient_id.eq.${profile.id})`
        );
      } else {
        query = query.or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!profile || !formData.recipient_id || !formData.subject || !formData.body) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: formData.recipient_id,
        subject: formData.subject,
        body: formData.body,
      });

      if (error) throw error;

      // Créer une notification
      await supabase.rpc('create_notification', {
        p_user_id: formData.recipient_id,
        p_title: 'Nouveau Message',
        p_message: `Vous avez reçu un message de votre encadreur: ${formData.subject}`,
        p_type: 'info',
        p_entity_type: 'message',
      });

      toast.success('Message envoyé');
      setFormData({ recipient_id: '', subject: '', body: '' });
      setShowCompose(false);
      loadMessages(selectedStudent || undefined);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      loadMessages(selectedStudent || undefined);
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const unreadCount = messages.filter(
    (m) => m.recipient_id === profile?.id && !m.read
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                <CardTitle>Messagerie</CardTitle>
                {unreadCount > 0 && (
                  <Badge variant="default">{unreadCount} non lu(s)</Badge>
                )}
              </div>
              <CardDescription>
                Communiquez avec vos étudiants
              </CardDescription>
            </div>
            <Button onClick={() => setShowCompose(!showCompose)}>
              <Send className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
          </div>
        </CardHeader>

        {showCompose && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Destinataire</Label>
              <Select
                value={formData.recipient_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, recipient_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un étudiant" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Objet</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Objet du message"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Votre message..."
                rows={6}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendMessage} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Filtrer par étudiant</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les étudiants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les étudiants</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.first_name} {student.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            {selectedStudent
              ? `Conversation avec ${
                  students.find((s) => s.id === selectedStudent)?.first_name
                } ${students.find((s) => s.id === selectedStudent)?.last_name}`
              : 'Tous les messages'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun message
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSent = message.sender_id === profile?.id;
                  const isUnread = !message.read && !isSent;

                  return (
                    <Card
                      key={message.id}
                      className={`cursor-pointer transition-colors ${
                        isUnread ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => !isSent && !message.read && markAsRead(message.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {isUnread ? (
                              <Mail className="h-4 w-4 text-primary" />
                            ) : (
                              <MailOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="text-base">
                                {message.subject}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {isSent ? (
                                  <>
                                    À: {message.recipient?.first_name}{' '}
                                    {message.recipient?.last_name}
                                  </>
                                ) : (
                                  <>
                                    De: {message.sender?.first_name}{' '}
                                    {message.sender?.last_name}
                                  </>
                                )}{' '}
                                • {format(new Date(message.created_at), 'PPp', { locale: fr })}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isSent && <Badge variant="secondary">Envoyé</Badge>}
                            {isUnread && <Badge variant="default">Non lu</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
