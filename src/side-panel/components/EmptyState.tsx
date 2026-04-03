import { JSX } from 'preact';

interface EmptyStateProps {
  onAction: () => void;
}

export const EmptyState = ({ onAction }: EmptyStateProps): JSX.Element => {
  return (
    <div className="empty-state-container" data-testid="empty-state">
      <div 
        className="dino-sleeping" 
        data-testid="sleeping-dino"
        aria-label="Sleeping Dinosaur"
      >
        {/* Dream Particles (Zzz) */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '20px',
          fontSize: '1.2rem',
          color: 'rgba(255, 255, 255, 0.4)',
          fontWeight: 700,
          animation: 'janitorFadeIn 2s infinite ease-in-out'
        }}>Z</div>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '5px',
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.3)',
          fontWeight: 600,
          animation: 'janitorFadeIn 2s infinite ease-in-out',
          animationDelay: '0.7s'
        }}>z</div>
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '45px',
          fontSize: '0.7rem',
          color: 'rgba(255, 255, 255, 0.2)',
          fontWeight: 500,
          animation: 'janitorFadeIn 2s infinite ease-in-out',
          animationDelay: '1.4s'
        }}>z</div>
      </div>
      
      <h3 className="empty-state-title">It's quiet in here...</h3>
      <p className="empty-state-subtitle">
        Save your open tabs to create your first workspace.
      </p>
      
      <button 
        className="btn-primary" 
        onClick={onAction}
        style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 600 }}
      >
        Create your first space
      </button>
    </div>
  );
};
