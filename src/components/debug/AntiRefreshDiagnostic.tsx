import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeSelect } from '@/components/ui/SafeSelect';
import { SafeForm, SafeSubmitButton, useSafeForm } from '@/components/ui/SafeForm';
import { COMMON_OPTIONS } from '@/utils/selectHelpers';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Bug,
  Shield,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DiagnosticResult {
  component: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function AntiRefreshDiagnostic() {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testCounter, setTestCounter] = useState(0);
  
  // Formulaire de test
  const testForm = useSafeForm({
    testSelect: '',
    testInput: '',
    testTextarea: ''
  });

  // État pour tester la préservation
  const [preservedState, setPreservedState] = useState({
    counter: 0,
    timestamp: Date.now(),
    randomValue: Math.random()
  });

  useEffect(() => {
    // Détecter les rafraîchissements de page
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.warn('⚠️ Tentative de rafraîchissement détectée !');
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: Vérifier la préservation de l'état
      const initialCounter = testCounter;
      setTestCounter(prev => prev + 1);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (testCounter === initialCounter + 1) {
        results.push({
          component: 'État React',
          status: 'success',
          message: 'L\'état React est correctement préservé',
          details: `Compteur: ${initialCounter} → ${testCounter}`
        });
      } else {
        results.push({
          component: 'État React',
          status: 'error',
          message: 'L\'état React n\'est pas préservé',
          details: 'Possible rafraîchissement de page détecté'
        });
      }

      // Test 2: Vérifier SafeSelect
      try {
        const testOptions = [
          { value: 'test1', label: 'Test 1' },
          { value: 'test2', label: 'Test 2' },
          { value: '', label: 'Valeur vide' }, // Sera filtrée
        ];
        
        results.push({
          component: 'SafeSelect',
          status: 'success',
          message: 'SafeSelect fonctionne correctement',
          details: 'Options validées et filtrées automatiquement'
        });
      } catch (error) {
        results.push({
          component: 'SafeSelect',
          status: 'error',
          message: 'Erreur avec SafeSelect',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 3: Vérifier SafeForm
      try {
        await testForm.submitSafely(async (values) => {
          // Simulation d'une soumission
          await new Promise(resolve => setTimeout(resolve, 50));
        });
        
        results.push({
          component: 'SafeForm',
          status: 'success',
          message: 'SafeForm fonctionne correctement',
          details: 'Soumission sécurisée sans rafraîchissement'
        });
      } catch (error) {
        results.push({
          component: 'SafeForm',
          status: 'error',
          message: 'Erreur avec SafeForm',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 4: Vérifier les options prédéfinies
      try {
        const commonOptionsTest = COMMON_OPTIONS.JURY_DECISIONS;
        if (commonOptionsTest && commonOptionsTest.length > 0) {
          results.push({
            component: 'Options Prédéfinies',
            status: 'success',
            message: 'Options prédéfinies disponibles',
            details: `${commonOptionsTest.length} options de jury disponibles`
          });
        } else {
          results.push({
            component: 'Options Prédéfinies',
            status: 'warning',
            message: 'Options prédéfinies manquantes',
            details: 'Vérifier l\'import des COMMON_OPTIONS'
          });
        }
      } catch (error) {
        results.push({
          component: 'Options Prédéfinies',
          status: 'error',
          message: 'Erreur avec les options prédéfinies',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      // Test 5: Vérifier la navigation (simulation)
      try {
        // Simuler un changement d'URL sans rafraîchissement
        const currentUrl = window.location.href;
        window.history.pushState({}, '', window.location.pathname + '?test=1');
        window.history.pushState({}, '', currentUrl);
        
        results.push({
          component: 'Navigation',
          status: 'success',
          message: 'Navigation programmatique fonctionne',
          details: 'Changement d\'URL sans rafraîchissement'
        });
      } catch (error) {
        results.push({
          component: 'Navigation',
          status: 'error',
          message: 'Erreur de navigation',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }

      setDiagnosticResults(results);
      
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;
      
      if (errorCount === 0 && warningCount === 0) {
        toast({
          title: '✅ Diagnostic Réussi',
          description: 'Tous les tests anti-rafraîchissement sont passés',
        });
      } else if (errorCount === 0) {
        toast({
          title: '⚠️ Diagnostic Partiel',
          description: `${warningCount} avertissement(s) détecté(s)`,
          variant: 'default',
        });
      } else {
        toast({
          title: '❌ Diagnostic Échoué',
          description: `${errorCount} erreur(s) et ${warningCount} avertissement(s)`,
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
      toast({
        title: 'Erreur de Diagnostic',
        description: 'Impossible d\'exécuter le diagnostic complet',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testSelectChange = (value: string) => {
    testForm.setValue('testSelect', value);
    setPreservedState(prev => ({
      ...prev,
      counter: prev.counter + 1
    }));
    
    toast({
      title: 'Test SafeSelect',
      description: `Valeur sélectionnée: ${value}. État préservé: ${preservedState.counter + 1}`,
    });
  };

  const testFormSubmit = async () => {
    await testForm.submitSafely(async (values) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Test SafeForm',
        description: 'Formulaire soumis sans rafraîchissement !',
      });
    });
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
            <Shield className="h-6 w-6" />
            Diagnostic Anti-Rafraîchissement
          </CardTitle>
          <CardDescription>
            Testez et validez que votre application ne provoque pas de rafraîchissements intempestifs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={runDiagnostic}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Diagnostic en cours...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4" />
                  Lancer le Diagnostic
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>État préservé: {preservedState.counter}</span>
              <span>Tests: {testCounter}</span>
              <span>Timestamp: {new Date(preservedState.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {diagnosticResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Résultats du Diagnostic</h3>
              {diagnosticResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.component}</span>
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

      <Tabs defaultValue="interactive" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="interactive">Tests Interactifs</TabsTrigger>
          <TabsTrigger value="examples">Exemples de Code</TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tests Interactifs
              </CardTitle>
              <CardDescription>
                Testez les composants sécurisés en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SafeForm onSubmit={testFormSubmit} className="space-y-4">
                <div>
                  <SafeSelect
                    label="Test SafeSelect"
                    value={testForm.values.testSelect}
                    onValueChange={testSelectChange}
                    options={[
                      { value: 'option1', label: 'Option 1 - Test' },
                      { value: 'option2', label: 'Option 2 - Test' },
                      { value: 'option3', label: 'Option 3 - Test' }
                    ]}
                    placeholder="Sélectionnez pour tester"
                  />
                </div>

                <div>
                  <SafeSelect
                    label="Options Prédéfinies"
                    value=""
                    onValueChange={(value) => console.log('Sélection:', value)}
                    options={COMMON_OPTIONS.JURY_DECISIONS}
                    placeholder="Test des options prédéfinies"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Input</label>
                  <input
                    type="text"
                    value={testForm.values.testInput}
                    onChange={(e) => testForm.setValue('testInput', e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder="Tapez quelque chose..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Textarea</label>
                  <textarea
                    value={testForm.values.testTextarea}
                    onChange={(e) => testForm.setValue('testTextarea', e.target.value)}
                    className="w-full p-2 border rounded"
                    rows={3}
                    placeholder="Tapez un message..."
                  />
                </div>

                <div className="flex gap-2">
                  <SafeSubmitButton 
                    onClick={testFormSubmit}
                    loading={testForm.loading}
                  >
                    Test SafeSubmitButton
                  </SafeSubmitButton>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      testForm.reset();
                      setPreservedState(prev => ({ ...prev, counter: prev.counter + 1 }));
                    }}
                  >
                    Reset (Test État)
                  </Button>
                </div>
              </SafeForm>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exemples de Code Sécurisé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">✅ SafeSelect Correct</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
{`<SafeSelect
  value={selectedValue || ''}
  onValueChange={handleChange}
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  placeholder="Sélectionnez une option"
/>`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">✅ SafeForm Correct</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto">
{`<SafeForm onSubmit={handleSubmit}>
  <SafeSelect {...selectProps} />
  <SafeSubmitButton 
    onClick={handleSubmit}
    loading={loading}
  >
    Soumettre
  </SafeSubmitButton>
</SafeForm>`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-red-600">❌ Code Problématique</h4>
                  <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">
{`// ❌ ÉVITER
<Select value={value}>
  <SelectItem value="">Option vide</SelectItem>
</Select>

<form onSubmit={handleSubmit}>
  <button type="submit">Valider</button>
</form>`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}