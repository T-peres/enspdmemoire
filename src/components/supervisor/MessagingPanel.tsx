import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Mail, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/types/database';

interface MessagingPanelProps {
  studentId: string;
  studentName: string;
}

export function MessagingPanel({ studentId, studentName }: MessagingPanelProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  });

  useEffect(() => {
    loadMessages();
  }, [studentId, profile]);

  const loadMessages = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name),
          recipient:profiles!messages_recipient_id_fkey(first_name, last_name)
        `)
        .or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${studentId}),and(sender_id.eq.${studentId},recipient_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!profile || !formData.subject || !formData.body) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: studentId,
        subject: formData.subject,
        body: formData.body,
      });

      if (error) throw error;

      // Créer une notification
      await supabase.rpc('create_notification', {
        p_user_id: studentId,
        p_title: 'Nouveau Message',
        p_message: `Vous avez reçu un message de votre encadreur: ${formData.subject}`,
        p_type: 'info',
        p_entity_type: 'message',
      });

      toast.success('Message envoyé');
      setFormData({ subject: '', body: '' });
      setShowCompose(false);
      loadMessages();
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

      loadMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messagerie avec {studentName}</CardTitle>
              <CardDescription>Communication directe avec l'étudiant</CardDescription>
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
          <CardTitle>Historique des messages</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun message échangé
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isSent = message.sender_id === profile?.id;
                  const isUnread = !message.read && !isSent;

                  return (
                    <Card
                      key={message.id}
                      className={isUnread ? 'border-primary' : ''}
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
                                {isSent ? 'Vous' : message.sender?.first_name}{' '}
                                {isSent ? '' : message.sender?.last_name} •{' '}
                                {format(new Date(message.created_at), 'PPp', { locale: fr })}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isSent && (
                              <Badge variant="secondary">Envoyé</Badge>
                            )}
                            {isUnread && (
                              <Badge variant="default">Non lu</Badge>
                            )}
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
