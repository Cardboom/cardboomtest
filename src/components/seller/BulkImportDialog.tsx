import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ImportRow {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  image_url?: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

interface BulkImportDialogProps {
  onImportComplete?: () => void;
}

export const BulkImportDialog = ({ onImportComplete }: BulkImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const VALID_CATEGORIES = ['pokemon', 'yugioh', 'magic', 'sports', 'lorcana', 'onepiece', 'figures', 'gaming'];
  const VALID_CONDITIONS = ['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor'];

  const downloadTemplate = () => {
    const headers = ['title', 'description', 'category', 'condition', 'price', 'image_url'];
    const exampleRow = [
      'Charizard 1st Edition Holo',
      'Base Set 1999, PSA 9 Grade, excellent condition',
      'pokemon',
      'near_mint',
      '5000',
      'https://example.com/image.jpg'
    ];
    
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardboom_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Validate and parse
      const importRow: ImportRow = {
        title: row.title || '',
        description: row.description || '',
        category: row.category?.toLowerCase() || 'pokemon',
        condition: row.condition?.toLowerCase().replace(' ', '_') || 'good',
        price: parseFloat(row.price) || 0,
        image_url: row.image_url || undefined,
        status: 'pending',
      };

      // Validation
      if (!importRow.title) {
        importRow.status = 'error';
        importRow.error = 'Title is required';
      } else if (!VALID_CATEGORIES.includes(importRow.category)) {
        importRow.status = 'error';
        importRow.error = `Invalid category. Valid: ${VALID_CATEGORIES.join(', ')}`;
      } else if (!VALID_CONDITIONS.includes(importRow.condition)) {
        importRow.status = 'error';
        importRow.error = `Invalid condition. Valid: ${VALID_CONDITIONS.join(', ')}`;
      } else if (importRow.price <= 0) {
        importRow.status = 'error';
        importRow.error = 'Price must be greater than 0';
      }

      rows.push(importRow);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to import listings',
        variant: 'destructive',
      });
      return;
    }

    const validRows = parsedRows.filter(row => row.status === 'pending');
    if (validRows.length === 0) {
      toast({
        title: 'No valid rows',
        description: 'Fix the errors in your CSV and try again',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const { error } = await supabase.from('listings').insert({
          seller_id: user.id,
          title: row.title,
          description: row.description,
          category: row.category,
          condition: row.condition,
          price: row.price,
          image_url: row.image_url,
          status: 'active',
          allows_vault: true,
          allows_trade: true,
          allows_shipping: true,
        });

        if (error) throw error;
        
        row.status = 'success';
        success++;
      } catch (error: any) {
        row.status = 'error';
        row.error = error.message || 'Failed to import';
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      setParsedRows([...parsedRows]); // Trigger re-render
    }

    setImportResults({ success, failed });
    setIsImporting(false);

    toast({
      title: 'Import complete',
      description: `${success} listings imported, ${failed} failed`,
    });

    if (success > 0) {
      onImportComplete?.();
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pendingCount = parsedRows.filter(r => r.status === 'pending').length;
  const errorCount = parsedRows.filter(r => r.status === 'error').length;
  const successCount = parsedRows.filter(r => r.status === 'success').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Bulk Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import Listings
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple listings at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Download our CSV template to get started
            </span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Preview</span>
                <Badge variant="outline">{parsedRows.length} rows</Badge>
                {pendingCount > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-500">{pendingCount} ready</Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">{errorCount} errors</Badge>
                )}
                {successCount > 0 && (
                  <Badge className="bg-green-500/20 text-green-500">{successCount} imported</Badge>
                )}
              </div>

              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-2">
                  {parsedRows.map((row, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        row.status === 'error' ? 'bg-destructive/10' :
                        row.status === 'success' ? 'bg-green-500/10' :
                        'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {row.status === 'pending' && <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                        {row.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        {row.status === 'error' && <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                        <span className="truncate">{row.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary">{row.category}</Badge>
                        <span className="font-medium">${row.price}</span>
                        {row.error && (
                          <span className="text-xs text-destructive max-w-32 truncate">{row.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Importing... {importProgress}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={pendingCount === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${pendingCount} Listings`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
