import { Space } from '../../lib/types';

interface SpaceCardProps {
  space: Space;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SpaceCard = ({ space, onRestore, onDelete }: SpaceCardProps) => {
  const tabCount = space.tabs?.length || 0;
  
  return (
    <div 
      className="card space-card" 
      data-testid={`space-card-${space.id}`}
      style={{ borderLeft: `4px solid ${space.color || '#444'}` }}
    >
      <div className="flex-row">
        <div className="space-info">
          <h4 style={{ margin: 0 }}>{space.name}</h4>
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
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
