import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ProgressDataPoint {
  date: string;
  overall: number;
  chapter1: number;
  chapter2: number;
  chapter3: number;
  chapter4: number;
}

interface ProgressChartProps {
  themeId?: string;
  studentId?: string;
}

/**
 * Graphique de progression
 * Affiche l'évolution de la progression au fil du temps
 */
export function ProgressChart({ themeId, studentId }: ProgressChartProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [themeId, studentId]);

  const loadProgressData = async () => {
    try {
      // Pour une vraie implémentation, vous auriez besoin d'une table d'historique
      // Ici, nous simulons avec les données actuelles
      const { data: ficheSuivi, error } = await supabase
        .from('fiche_suivi')
        .select('*')
        .eq(themeId ? 'theme_id' : 'student_id', themeId || studentId || user?.id)
        .single();

      if (error) throw error;

      if (ficheSuivi) {
        // Simuler des données historiques pour la démonstration
        const progressData: ProgressDataPoint[] = [
          {
            date: 'Semaine 1',
            overall: 10,
            chapter1: 20,
            chapter2: 0,
            chapter3: 0,
            chapter4: 0,
          },
          {
            date: 'Semaine 2',
            overall: 25,
            chapter1: 50,
            chapter2: 10,
            chapter3: 0,
            chapter4: 0,
          },
          {
            date: 'Semaine 3',
            overall: 40,
            chapter1: 80,
            chapter2: 30,
            chapter3: 10,
            chapter4: 0,
          },
          {
            date: 'Semaine 4',
            overall: 55,
            chapter1: 100,
            chapter2: 60,
            chapter3: 20,
            chapter4: 0,
          },
          {
            date: 'Actuel',
            overall: ficheSuivi.overall_progress,
            chapter1: ficheSuivi.chapter_1_progress,
            chapter2: ficheSuivi.chapter_2_progress,
            chapter3: ficheSuivi.chapter_3_progress,
            chapter4: ficheSuivi.chapter_4_progress,
          },
        ];

        setData(progressData);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution de la Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution de la Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Aucune donnée de progression disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Évolution de la Progression
        </CardTitle>
        <CardDescription>
          Suivi de l'avancement de votre mémoire au fil du temps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              formatter={(value: number) => `${value}%`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="#8b5cf6"
              strokeWidth={3}
              name="Progression Globale"
              dot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="chapter1"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Chapitre 1"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="chapter2"
              stroke="#10b981"
              strokeWidth={2}
              name="Chapitre 2"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="chapter3"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Chapitre 3"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="chapter4"
              stroke="#ef4444"
              strokeWidth={2}
              name="Chapitre 4"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-xs text-gray-600">Global</p>
            <p className="text-lg font-bold text-purple-600">
              {data[data.length - 1].overall}%
            </p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-xs text-gray-600">Ch. 1</p>
            <p className="text-lg font-bold text-blue-600">
              {data[data.length - 1].chapter1}%
            </p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-xs text-gray-600">Ch. 2</p>
            <p className="text-lg font-bold text-green-600">
              {data[data.length - 1].chapter2}%
            </p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <p className="text-xs text-gray-600">Ch. 3</p>
            <p className="text-lg font-bold text-orange-600">
              {data[data.length - 1].chapter3}%
            </p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-xs text-gray-600">Ch. 4</p>
            <p className="text-lg font-bold text-red-600">
              {data[data.length - 1].chapter4}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
