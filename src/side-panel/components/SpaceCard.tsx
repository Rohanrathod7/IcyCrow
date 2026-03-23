import { Space } from '../../lib/types';

interface SpaceCardProps {
  space: Space;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SpaceCard = ({ space, onRestore, onDelete }: SpaceCardProps) => {
  const tabCount = space.tabs?.length || 0;
  const favicons = space.tabs?.slice(0, 5).map(t => t.favicon).filter(Boolean) || [];
  
  return (
    <div 
      className="card space-card bento-card" 
      data-testid={`space-card-${space.id}`}
      style={{ borderLeft: `4px solid ${space.color || '#444'}` }}
    >
      <div className="flex-col gap-12">
        <div className="flex-row items-center">
          <div className="space-info flex-1">
            <h4 className="text-truncate" style={{ margin: 0, fontSize: '1rem' }}>{space.name}</h4>
            <span className="text-dim small">{tabCount} tabs</span>
          </div>
          
          <div className="flex-row gap-8">
            <button 
              className="btn-secondary small"
              onClick={() => onRestore(space.id)}
              title="Restore Space"
            >
              Restore
            </button>
            <button 
              className="btn-icon small danger"
              onClick={() => onDelete(space.id)}
              title="Delete Space"
              style={{ fontSize: '1rem' }}
            >
              ×
            </button>
          </div>
        </div>

        {favicons.length > 0 && (
          <div className="favicon-strip flex-row gap-4" style={{ marginTop: '4px' }}>
            {favicons.map((url, i) => (
              <img 
                key={i}
                src={url as string} 
                className="tab-icon small" 
                style={{ 
                  width: '18px', 
                  height: '18px',
                  borderRadius: '3px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} 
              />
            ))}
            {tabCount > 5 && (
              <span className="text-dim small" style={{ marginLeft: '4px', alignSelf: 'center' }}>
                +{tabCount - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
