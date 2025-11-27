import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useThemes } from '@/hooks/useThemes';
import { Loader2 } from 'lucide-react';

const themeSchema = z.object({
  title: z.string().min(10, 'Le titre doit contenir au moins 10 caractères'),
  description: z.string().min(50, 'La description doit contenir au moins 50 caractères'),
  objectives: z.string().min(20, 'Les objectifs doivent contenir au moins 20 caractères'),
  methodology: z.string().min(20, 'La méthodologie doit contenir au moins 20 caractères'),
});

type ThemeFormData = z.infer<typeof themeSchema>;

export function ThemeSubmissionForm() {
  const { createTheme } = useThemes();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ThemeFormData>({
    resolver: zodResolver(themeSchema),
  });

  const onSubmit = async (data: ThemeFormData) => {
    setIsSubmitting(true);
    try {
      await createTheme.mutateAsync(data);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposer un thème de mémoire</CardTitle>
        <CardDescription>
          Remplissez tous les champs pour soumettre votre proposition de thème
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre du thème *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Développement d'une application de gestion..."
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Décrivez votre thème en détail..."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="objectives">Objectifs *</Label>
            <Textarea
              id="objectives"
              {...register('objectives')}
              placeholder="Quels sont les objectifs de ce travail?"
              rows={3}
            />
            {errors.objectives && (
              <p className="text-sm text-red-500 mt-1">{errors.objectives.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="methodology">Méthodologie *</Label>
            <Textarea
              id="methodology"
              {...register('methodology')}
              placeholder="Quelle méthodologie allez-vous utiliser?"
              rows={3}
            />
            {errors.methodology && (
              <p className="text-sm text-red-500 mt-1">{errors.methodology.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Soumettre le thème
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
