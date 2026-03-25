import { render } from 'preact';
import { useMemo } from 'preact/hooks';

function WorkspaceApp() {
  const pdfUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('file');
  }, []);

  return (
    <div style={{ 
      padding: '24px', 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <header style={{ gridColumn: '1 / -1', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          background: 'linear-gradient(to right, #90CAF9, #F48FB1)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent'
        }}>
          IcyCrow Spatial Workspace
        </h1>
        <p style={{ color: '#aaa', marginTop: '8px' }}>
          Coordinate-based Annotation Engine
        </p>
      </header>

      <section style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '16px', 
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Intercepted Document</h2>
        <code style={{ 
          display: 'block', 
          wordBreak: 'break-all', 
          color: '#90CAF9',
          background: '#000',
          padding: '12px',
          borderRadius: '8px'
        }}>
          {pdfUrl || 'No file provided'}
        </code>
      </section>

      <section style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '16px', 
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Workspace Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4CAF50' }}></div>
          <span>Active & Secure</span>
        </div>
      </section>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<WorkspaceApp />, root);
}
