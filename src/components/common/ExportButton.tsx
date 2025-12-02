import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  formats?: ('csv' | 'json' | 'pdf')[];
}

/**
 * Bouton d'export de données
 * Permet d'exporter des données en différents formats
 */
export function ExportButton({ data, filename, formats = ['csv', 'json'] }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    setExporting(true);

    try {
      // Obtenir les en-têtes
      const headers = Object.keys(data[0]);
      
      // Créer le contenu CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            // Échapper les virgules et guillemets
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ].join('\n');

      // Créer le blob et télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${filename}.csv`);

      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    setExporting(true);

    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      downloadBlob(blob, `${filename}.json`);

      toast.success('Export JSON réussi');
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    toast.info('Export PDF en cours de développement');
    // TODO: Implémenter l'export PDF avec une bibliothèque comme jsPDF
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <Table className="h-4 w-4 mr-2" />;
      case 'json':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'pdf':
        return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      default:
        return <Download className="h-4 w-4 mr-2" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Exporter en CSV';
      case 'json':
        return 'Exporter en JSON';
      case 'pdf':
        return 'Exporter en PDF';
      default:
        return 'Exporter';
    }
  };

  const handleExport = (format: string) => {
    switch (format) {
      case 'csv':
        exportToCSV();
        break;
      case 'json':
        exportToJSON();
        break;
      case 'pdf':
        exportToPDF();
        break;
    }
  };

  if (formats.length === 1) {
    return (
      <Button
        variant="outline"
        onClick={() => handleExport(formats[0])}
        disabled={exporting || data.length === 0}
      >
        {getFormatIcon(formats[0])}
        {exporting ? 'Export...' : getFormatLabel(formats[0])}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Export...' : 'Exporter'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => (
          <DropdownMenuItem
            key={format}
            onClick={() => handleExport(format)}
          >
            {getFormatIcon(format)}
            {getFormatLabel(format)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
