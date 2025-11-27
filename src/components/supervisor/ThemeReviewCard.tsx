import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Theme } from '@/types/database';
import { useSupervisorThemes } from '@/hooks/useThemes';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ThemeReviewCardProps {
  theme: Theme;
}

export function ThemeReviewCard({ theme }: ThemeReviewCardProps) {
  const { reviewTheme } = useSupervisorThemes();
  const [notes, setNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = async (status: 'approved' | 'rejected' | 'revision_requested') => {
    setIsReviewing(true);
    try {
      await reviewTheme.mutateAsync({
        themeId: theme.id,
        status,
        notes: notes || undefined,
      });
      setNotes('');
    } finally {
      setIsReviewing(false);
    }
  };

  const isPending = theme.status === 'pending' || theme.status === 'revision_requested';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{theme.title}</CardTitle>
          <Badge variant={theme.status === 'approved' ? 'default' : 'secondary'}>
            {theme.status}
          </Badge>
        </div>
        <CardDescription>
          Étudiant: {theme.student?.first_name} {theme.student?.last_name} ({theme.student?.student_id})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Description:</p>
          <p className="text-sm text-gray-600">{theme.description}</p>
        </div>

        {theme.objectives && (
          <div>
            <p className="text-sm font-medium">Objectifs:</p>
            <p className="text-sm text-gray-600">{theme.objectives}</p>
          </div>
        )}

        {theme.methodology && (
          <div>
            <p className="text-sm font-medium">Méthodologie:</p>
            <p className="text-sm text-gray-600">{theme.methodology}</p>
          </div>
        )}

        {isPending && (
          <>
            <div>
              <label className="text-sm font-medium">Notes / Commentaires:</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez vos commentaires..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleReview('approved')}
                disabled={isReviewing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isReviewing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approuver
              </Button>

              <Button
                onClick={() => handleReview('revision_requested')}
                disabled={isReviewing}
                variant="outline"
                className="flex-1"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Révision
              </Button>

              <Button
                onClick={() => handleReview('rejected')}
                disabled={isReviewing}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeter
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
