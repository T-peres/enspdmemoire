import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function StudentMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchMessages();
    }
  }, [profile]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name),
          recipient:profiles!messages_recipient_id_fkey(first_name, last_name)
        `)
        .or(`sender_id.eq.${profile?.id},recipient_id.eq.${profile?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);

      // Marquer les messages non lus comme lus
      const unreadIds = data
        ?.filter(m => m.recipient_id === profile?.id && !m.is_read)
        .map(m => m.id) || [];

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Veuillez saisir un message');
      return;
    }

    try {
      setSending(true);

      // Récupérer l'encadreur
      const { data: assignment } = await supabase
        .from('supervisor_assignments')
        .select('supervisor_id')
        .eq('student_id', profile?.id)
        .eq('is_active', true)
        .single();

      if (!assignment) {
        toast.error('Vous n\'avez pas d\'encadreur assigné');
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile?.id,
          recipient_id: assignment.supervisor_id,
          content: newMessage,
          is_read: false,
        });

      if (error) throw error;

      toast.success('Message envoyé');
      setNewMessage('');
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Messagerie
          </CardTitle>
          <CardDescription>
            Communiquez avec votre encadreur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <Button onClick={sendMessage} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Aucun message</p>
              <p className="text-sm text-gray-500">
                Commencez une conversation avec votre encadreur
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isSent = message.sender_id === profile?.id;
                return (
                  <div
                    key={message.id}
                    className={`border rounded-lg p-4 ${
                      isSent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-sm">
                          {isSent
                            ? 'Vous'
                            : `${message.sender?.first_name} ${message.sender?.last_name}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {!isSent && !message.is_read && (
                          <Badge variant="default" className="text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{message.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
