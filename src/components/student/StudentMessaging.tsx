import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Mail, MailOpen, User, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Message } from '@/types/database';

interface StudentMessagingProps {
  supervisorId: string;
  supervisorName: string;
  themeId?: string;
}

export function StudentMessaging({ supervisorId, supervisorName, themeId }: StudentMessagingProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  });
  
  // Référence pour l'annulation des requêtes
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction pour annuler les requêtes en cours
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  // Chargement des messages avec gestion d'erreurs et annulation
  const loadMessages = useCallback(async (signal?: AbortSignal) => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(first_name, last_name)
        `)
        .or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${supervisorId}),and(sender_id.eq.${supervisorId},recipient_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: false });

      if (signal?.aborted) return;
      if (fetchError) throw fetchError;

      setMessages(data || []);
    } catch (error: any) {
      if (!signal?.aborted) {
        console.error('Error loading messages:', error);
        setError(error.message);
        toast.error('Erreur lors du chargement des messages');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [profile?.id, supervisorId]);

  useEffect(() => {
    const signal = cancelPendingRequests();
    loadMessages(signal);
    
    // S'abonner aux nouveaux messages en temps réel
    const channel = supabase
      .channel('student-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profile?.id}`,
        },
        () => {
          // Recharger les messages sans signal d'annulation pour les mises à jour temps réel
          loadMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [supervisorId, profile?.id, loadMessages, cancelPendingRequests]);



  const handleSendMessage = async () => {
    if (!profile || !formData.subject.trim() || !formData.body.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: supervisorId,
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        read: false, // Utiliser 'read' au lieu de 'is_read' pour harmoniser
        theme_id: themeId, // Associer le message au thème si disponible
      });

      if (error) throw error;

      // Créer une notification pour l'encadreur via RPC
      await supabase.rpc('create_notification', {
        p_user_id: supervisorId,
        p_title: 'Nouveau Message Étudiant',
        p_message: `${profile.first_name} ${profile.last_name} vous a envoyé un message: ${formData.subject}`,
        p_type: 'info',
        p_entity_type: 'message',
        p_entity_id: null,
      });

      toast.success('Message envoyé avec succès');
      setFormData({ subject: '', body: '' });
      setShowCompose(false);
      
      // Recharger les messages
      const signal = cancelPendingRequests();
      loadMessages(signal);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .eq('recipient_id', profile?.id); // Sécurité: seul le destinataire peut marquer comme lu

      if (error) throw error;

      // Mise à jour optimiste de l'état local
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true, read_at: new Date().toISOString() } : msg
      ));
    } catch (error: any) {
      console.error('Error marking message as read:', error);
      toast.error('Erreur lors du marquage du message');
    }
  };

  const unreadCount = messages.filter(m => !m.read && m.recipient_id === profile?.id).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Communication avec {supervisorName}
              </CardTitle>
              <CardDescription>
                {unreadCount > 0 && (
                  <Badge variant="default" className="mt-2">
                    {unreadCount} message(s) non lu(s)
                  </Badge>
                )}
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
                                {isSent ? 'Vous' : supervisorName} •{' '}
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
