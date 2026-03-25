import { render } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { PdfViewer } from './components/PdfViewer';
import { InkCanvas } from './components/InkCanvas';

function WorkspaceApp() {
  const fileUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('file');
  }, []);

  const [canvasDim, setCanvasDim] = useState({ width: 0, height: 0 });

  const handlePdfLoad = (page: any) => {
    const viewport = page.getViewport({ scale: 1.5 });
    setCanvasDim({ width: viewport.width, height: viewport.height });
  };

  return (
    <div style={{ 
      padding: '24px', 
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#fff',
      minHeight: '100vh',
      background: '#121212'
    }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          background: 'linear-gradient(to right, #90CAF9, #F48FB1)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          IcyCrow Spatial Workspace
        </h1>
        <p style={{ color: '#aaa', marginTop: '8px' }}>
          Coordinate-based Annotation Engine
        </p>
      </header>

      <main style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{ position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
          <PdfViewer fileUrl={fileUrl} onLoad={handlePdfLoad} />
          {canvasDim.width > 0 && (
            <InkCanvas 
              width={canvasDim.width} 
              height={canvasDim.height} 
              fileUrl={fileUrl} 
              pageNumber={1} 
            />
          )}
        </div>

        <section style={{ 
          width: '100%',
          maxWidth: '800px',
          background: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '16px', 
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Document Info</h2>
          <code style={{ 
            display: 'block', 
            wordBreak: 'break-all', 
            color: '#90CAF9',
            background: '#000',
            padding: '12px',
            borderRadius: '8px'
          }}>
            {fileUrl || 'No file provided'}
          </code>
        </section>
      </main>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<WorkspaceApp />, root);
}
