import { Component, ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[IcyCrow] Panel Crash Intercepted:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="view-container flex-col items-center justify-center" style={{ height: '100vh', padding: '20px', textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: '24px', maxWidth: '400px' }}>
            <h2 style={{ color: 'var(--danger)', marginBottom: '12px' }}>⚠️ Something went wrong</h2>
            <p className="text-dim" style={{ marginBottom: '20px' }}>
              IcyCrow encountered an unexpected error. Don't worry, your data is safe (it's local-first!).
            </p>
            <div className="error-stack" style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              textAlign: 'left',
              marginBottom: '20px',
              maxHeight: '150px',
              overflow: 'auto',
              border: '1px solid var(--border-color)'
            }}>
              <code>{this.state.error?.toString()}</code>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => window.location.reload()}
              style={{ width: '100%' }}
            >
              Reset Extension
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
