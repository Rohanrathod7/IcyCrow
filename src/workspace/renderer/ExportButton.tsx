import { useState } from 'preact/hooks';
import { flattenAnnotations } from '../../lib/spatial-engine/pdf-flattener';
import { getAllSpatialAnnotations } from '../../lib/storage';

interface ExportButtonProps {
  fileUrl: string | null;
}

export function ExportButton({ fileUrl }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!fileUrl) return;
    setIsExporting(true);

    try {
      // 1. Fetch original PDF buffer
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();

      // 2. Fetch all spatial annotations for this file
      const annotations = await getAllSpatialAnnotations(fileUrl);

      // 3. Flatten
      const flattened = await flattenAnnotations(buffer, annotations);

      // 4. Trigger download
      const blob = new Blob([flattened as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `icycrow-annotated-${new Date().getTime()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[IcyCrow] Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !fileUrl}
      style={{
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        background: isExporting ? '#555' : 'linear-gradient(135deg, #F48FB1, #FF4081)',
        color: '#fff',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(255, 64, 129, 0.3)',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {isExporting ? 'Baking PDF...' : 'Export Annotated PDF'}
    </button>
  );
}
