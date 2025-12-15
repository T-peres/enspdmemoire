import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Upload,
  FileText,
  Database,
  Shield,
  Folder
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function DocumentUploadDiagnostic() {
  const { user, profile } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostic = async () => {
    if (!user || !profile) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour exécuter le diagnostic',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Vérifier l'authentification
      diagnosticResults.push({
        test: 'Authentification',
        status: 'success',
        message: 'Utilisateur authentifié',
        details: `ID: ${user.id}, Email: ${user.email}`
      });

      // Test 2: Vérifier le profil utilisateur
      if (profile.first_name && profile.last_name) {
        diagnosticResults.push({
          test: 'Profil Utilisateur',
          status: 'success',
          message: 'Profil complet',
          details: `${profile.first_name} ${profile.last_name}`
        });
      } else {
        diagnosticResults.push({
          test: 'Profil Utilisateur',
          status: 'warning',
          message: 'Profil incomplet',
          details: 'Nom ou prénom manquant'
        });
      }

      // Test 3: Vérifier les rôles utilisateur
      try {
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (roles && roles.length > 0) {
          diagnosticResults.push({
            test: 'Rôles Utilisateur',
            status: 'success',
            message: `${roles.length} rôle(s) assigné(s)`,
            details: roles.map(r => r.role).join(', ')
          });
        } else {
          diagnosticResults.push({
            test: 'Rôles Utilisateur',
            status: 'error',
            message: 'Aucun rôle assigné',
            details: 'L\'utilisateur doit avoir au moins un rôle'
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Rôles Utilisateur',
          status: 'error',
          message: 'Erreur lors de la vérification des rôles',
          details: error.message
        });
      }

      // Test 4: Vérifier l'accès au bucket storage
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) throw bucketsError;

        const documentsBucket = buckets?.find(b => b.id === 'documents');
        if (documentsBucket) {
          diagnosticResults.push({
            test: 'Bucket Documents',
            status: 'success',
            message: 'Bucket documents accessible',
            details: `Public: ${documentsBucket.public ? 'Oui' : 'Non'}`
          });
        } else {
          diagnosticResults.push({
            test: 'Bucket Documents',
            status: 'error',
            message: 'Bucket documents introuvable',
            details: 'Le bucket de stockage des documents n\'existe pas'
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Bucket Documents',
          status: 'error',
          message: 'Erreur d\'accès au storage',
          details: error.message
        });
      }

      // Test 5: Tester les permissions de dossier utilisateur
      try {
        const testPath = `${user.id}/test/`;
        const { data: files, error: listError } = await supabase.storage
          .from('documents')
          .list(testPath);

        // Si pas d'erreur, les permissions de lecture fonctionnent
        diagnosticResults.push({
          test: 'Permissions Dossier',
          status: 'success',
          message: 'Accès au dossier utilisateur',
          details: `Chemin: ${testPath}`
        });
      } catch (error: any) {
        if (error.message.includes('not found')) {
          diagnosticResults.push({
            test: 'Permissions Dossier',
            status: 'success',
            message: 'Dossier utilisateur accessible (vide)',
            details: 'Normal pour un nouveau compte'
          });
        } else {
          diagnosticResults.push({
            test: 'Permissions Dossier',
            status: 'error',
            message: 'Erreur d\'accès au dossier',
            details: error.message
          });
        }
      }

      // Test 6: Tester l'insertion dans la table documents (simulation)
      try {
        const testDocument = {
          theme_id: '00000000-0000-0000-0000-000000000000', // UUID fictif pour test
          student_id: user.id,
          document_type: 'plan',
          title: 'Test Document - À Supprimer',
          file_path: 'test-path',
          file_hash: 'test-hash',
          file_size: 1024,
          mime_type: 'application/pdf',
          status: 'submitted'
        };

        // Tenter l'insertion (sera probablement rejetée à cause de la foreign key)
        const { error: insertError } = await supabase
          .from('documents')
          .insert(testDocument);

        if (insertError) {
          if (insertError.message.includes('foreign key')) {
            diagnosticResults.push({
              test: 'Permissions Table Documents',
              status: 'success',
              message: 'Permissions d\'insertion OK',
              details: 'Rejeté pour clé étrangère (normal en test)'
            });
          } else if (insertError.message.includes('policy')) {
            diagnosticResults.push({
              test: 'Permissions Table Documents',
              status: 'error',
              message: 'Politique RLS bloque l\'insertion',
              details: insertError.message
            });
          } else {
            diagnosticResults.push({
              test: 'Permissions Table Documents',
              status: 'warning',
              message: 'Erreur d\'insertion',
              details: insertError.message
            });
          }
        } else {
          // Si l'insertion réussit, supprimer le document de test
          await supabase
            .from('documents')
            .delete()
            .eq('title', 'Test Document - À Supprimer')
            .eq('student_id', user.id);

          diagnosticResults.push({
            test: 'Permissions Table Documents',
            status: 'success',
            message: 'Insertion et suppression réussies',
            details: 'Toutes les permissions fonctionnent'
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Permissions Table Documents',
          status: 'error',
          message: 'Erreur lors du test d\'insertion',
          details: error.message
        });
      }

      // Test 7: Vérifier les sujets de mémoire disponibles
      try {
        const { data: selections, error: selectionsError } = await supabase
          .from('topic_selections')
          .select('*, topic:thesis_topics(*)')
          .eq('student_id', user.id)
          .eq('status', 'confirmed');

        if (selectionsError) throw selectionsError;

        if (selections && selections.length > 0) {
          diagnosticResults.push({
            test: 'Sujet de Mémoire',
            status: 'success',
            message: 'Sujet confirmé trouvé',
            details: `Titre: ${selections[0].topic?.title || 'Non défini'}`
          });
        } else {
          diagnosticResults.push({
            test: 'Sujet de Mémoire',
            status: 'warning',
            message: 'Aucun sujet confirmé',
            details: 'Vous devez sélectionner un sujet pour uploader des documents'
          });
        }
      } catch (error: any) {
        diagnosticResults.push({
          test: 'Sujet de Mémoire',
          status: 'error',
          message: 'Erreur lors de la vérification du sujet',
          details: error.message
        });
      }

      setResults(diagnosticResults);

      // Résumé du diagnostic
      const errors = diagnosticResults.filter(r => r.status === 'error').length;
      const warnings = diagnosticResults.filter(r => r.status === 'warning').length;

      if (errors === 0 && warnings === 0) {
        toast({
          title: '✅ Diagnostic Réussi',
          description: 'Tous les tests sont passés. L\'upload devrait fonctionner.',
        });
      } else if (errors === 0) {
        toast({
          title: '⚠️ Diagnostic Partiel',
          description: `${warnings} avertissement(s). L'upload peut fonctionner.`,
        });
      } else {
        toast({
          title: '❌ Diagnostic Échoué',
          description: `${errors} erreur(s) critique(s). L'upload ne fonctionnera pas.`,
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      console.error('Erreur lors du diagnostic:', error);
      toast({
        title: 'Erreur de Diagnostic',
        description: 'Impossible d\'exécuter le diagnostic complet',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Succès</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Avertissement</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-6 w-6" />
            Diagnostic Upload de Documents
          </CardTitle>
          <CardDescription>
            Vérifiez que toutes les permissions sont correctement configurées pour l'upload de documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={runDiagnostic}
              disabled={testing || !user}
              className="flex items-center gap-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Diagnostic en cours...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Lancer le Diagnostic
                </>
              )}
            </Button>
            
            {user && (
              <div className="text-sm text-muted-foreground">
                Utilisateur: {user.email}
              </div>
            )}
          </div>

          {!user && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vous devez être connecté pour exécuter le diagnostic.
              </AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Résultats du Diagnostic</h3>
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.test}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Solutions aux Problèmes Courants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-red-600">❌ Erreur: "Row Level Security Policy"</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Les politiques RLS bloquent l'upload. Solutions :
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Exécuter le script <code>fix-document-upload-permissions.sql</code></li>
              <li>Vérifier que l'utilisateur a le rôle "student"</li>
              <li>S'assurer que le bucket "documents" existe</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-yellow-600">⚠️ Avertissement: "Aucun sujet confirmé"</h4>
            <p className="text-sm text-muted-foreground mb-2">
              L'étudiant doit avoir un sujet de mémoire confirmé. Solutions :
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Aller sur la page "Sujets" et sélectionner un sujet</li>
              <li>Attendre la confirmation du chef de département</li>
              <li>Contacter l'administration si nécessaire</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-blue-600">ℹ️ Info: Structure des Dossiers</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Les documents sont organisés ainsi :
            </p>
            <code className="text-xs bg-muted p-2 rounded block">
              documents/[user_id]/[theme_id]/[timestamp]_[filename].pdf
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}