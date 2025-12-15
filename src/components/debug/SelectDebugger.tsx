import { useState } from 'react';
import { SafeSelect } from '@/components/ui/SafeSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COMMON_OPTIONS, validateSelectOptions } from '@/utils/selectHelpers';

export function SelectDebugger() {
  const [testValue, setTestValue] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>({});

  const testOptions = [
    { value: 'valid1', label: 'Option Valide 1' },
    { value: 'valid2', label: 'Option Valide 2' },
    { value: '', label: 'Option Invalide (valeur vide)' }, // Cette option sera filtrée
    { value: 'valid3', label: '' }, // Cette option sera filtrée
    { value: 'valid4', label: 'Option Valide 4' },
  ];

  const runDebugTest = () => {
    const validatedOptions = validateSelectOptions(testOptions);
    
    setDebugInfo({
      originalOptions: testOptions,
      validatedOptions,
      filteredCount: testOptions.length - validatedOptions.length,
      currentValue: testValue,
      commonOptions: COMMON_OPTIONS
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Débogueur SafeSelect</CardTitle>
          <CardDescription>
            Testez le composant SafeSelect et vérifiez la validation des options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <SafeSelect
              label="Test SafeSelect"
              value={testValue}
              onValueChange={setTestValue}
              options={testOptions}
              placeholder="Sélectionnez une option de test"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={runDebugTest}>
              Exécuter Test de Validation
            </Button>
            <span className="text-sm text-muted-foreground">
              Valeur actuelle: {testValue || 'Aucune'}
            </span>
          </div>
          
          {debugInfo.originalOptions && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Options Originales ({debugInfo.originalOptions.length})</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(debugInfo.originalOptions, null, 2)}
                </pre>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">
                  Options Validées ({debugInfo.validatedOptions.length})
                  {debugInfo.filteredCount > 0 && (
                    <span className="text-red-500 ml-2">
                      ({debugInfo.filteredCount} filtrée(s))
                    </span>
                  )}
                </h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(debugInfo.validatedOptions, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>📋 Options Prédéfinies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <SafeSelect
              label="Décisions Jury"
              value=""
              onValueChange={() => {}}
              options={COMMON_OPTIONS.JURY_DECISIONS}
              placeholder="Sélectionnez une décision"
            />
          </div>
          
          <div>
            <SafeSelect
              label="Priorités"
              value=""
              onValueChange={() => {}}
              options={COMMON_OPTIONS.PRIORITY}
              placeholder="Sélectionnez une priorité"
            />
          </div>
          
          <div>
            <SafeSelect
              label="Types de Documents"
              value=""
              onValueChange={() => {}}
              options={COMMON_OPTIONS.DOCUMENT_TYPES}
              placeholder="Sélectionnez un type"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}