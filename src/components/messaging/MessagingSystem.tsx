import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Message, Profile } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  PenTool, 
  Search,
  Clock,
  CheckCircle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExtendedMessage extends Message {
  sender: Profile;
  recipient: Profile;
}

export function MessagingSystem() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposeDialog, setShowComposeDialog] = useState(false);

  // Formulaire de composition
  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    if (profile) {
      fetchMessages();
      fetchContacts();
    }
  }, [profile]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, first_name, last_name, email),
          recipient:profiles!messages_recipient_id_fkey(id, first_name, last_name, email)
        `)
        .or(`sender_id.eq.${profile?.id},recipient_id.eq.${profile?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data as ExtendedMessage[] || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      // Récupérer les utilisateurs avec qui on peut communiquer
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .neq('id', profile?.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const sendMessage = async () => {
    if (!composeForm.recipient_id || !composeForm.subject || !composeForm.body) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile?.id,
          recipient_id: composeForm.recipient_id,
          subject: composeForm.subject,
          body: composeForm.body
        });

      if (error) throw error;

      // Créer une notification pour le destinataire
      await supabase.rpc('create_notification', {
        p_user_id: composeForm.recipient_id,
        p_title: 'Nouveau message',
        p_message: `Nouveau message de ${profile?.first_name} ${profile?.last_name}: ${composeForm.subject}`,
        p_type: 'info',
        p_entity_type: 'message',
        p_entity_id: null
      });

      toast.success('Message envoyé avec succès');
      setShowComposeDialog(false);
      setComposeForm({ recipient_id: '', subject: '', body: '' });
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', profile?.id);

      if (error) throw error;
      fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const filteredMessages = messages.filter(message =>
    message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const receivedMessages = filteredMessages.filter(m => m.recipient_id === profile?.id);
  const sentMessages = filteredMessages.filter(m => m.sender_id === profile?.id);
  const unreadCount = receivedMessages.filter(m => !m.read).length;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const MessageCard = ({ message, isSent = false }: { message: ExtendedMessage; isSent?: boolean }) => (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
        !message.read && !isSent ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onClick={() => {
        setSelectedMessage(message);
        if (!message.read && !isSent) {
          markAsRead(message.id);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {isSent 
                  ? getInitials(message.recipient.first_name, message.recipient.last_name)
                  : getInitials(message.sender.first_name, message.sender.last_name)
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {isSent 
                    ? `À: ${message.recipient.first_name} ${message.recipient.last_name}`
                    : `De: ${message.sender.first_name} ${message.sender.last_name}`
                  }
                </span>
                {!message.read && !isSent && (
                  <Badge variant="default" className="text-xs">Nouveau</Badge>
                )}
              </div>
              <h4 className="font-medium text-gray-900 truncate">{message.subject}</h4>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">{message.body}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-4">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(message.created_at), { 
                addSuffix: true, 
                locale: fr 
              })}
            </span>
            {message.read && !isSent && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Messagerie
          </h2>
          <p className="text-gray-600">
            {unreadCount > 0 && (
              <span className="text-blue-600 font-medium">
                {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
              <PenTool className="h-4 w-4 mr-2" />
              Nouveau Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Composer un message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Destinataire</Label>
                <Select 
                  value={composeForm.recipient_id} 
                  onValueChange={(value) => setComposeForm(prev => ({ ...prev, recipient_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un destinataire" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(contact.first_name, contact.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          {contact.first_name} {contact.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Sujet du message"
                />
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={composeForm.body}
                  onChange={(e) => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Tapez votre message ici..."
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Rechercher dans les messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Messages */}
      <Tabs defaultValue="received" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Reçus ({receivedMessages.length})
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Envoyés ({sentMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedMessages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                Aucun message reçu
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {receivedMessages.map(message => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentMessages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <Send className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                Aucun message envoyé
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {sentMessages.map(message => (
                  <MessageCard key={message.id} message={message} isSent />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de lecture de message */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {selectedMessage.subject}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {getInitials(selectedMessage.sender.first_name, selectedMessage.sender.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedMessage.sender.first_name} {selectedMessage.sender.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedMessage.sender.email}</p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(selectedMessage.created_at), { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </p>
                </div>
              </div>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}