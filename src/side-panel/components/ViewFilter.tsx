import { dashboardViewMode, setViewMode } from '../store';
import { LayoutGrid, FileText } from 'lucide-preact';

export const ViewFilter = () => {
  const mode = dashboardViewMode.value;

  return (
    <div className="view-filter-container">
      <div className="view-filter-track">
        {/* Sliding background highlight */}
        <div 
          className="view-filter-highlight" 
          style={{ 
            transform: `translateX(${mode === 'spaces' ? '0' : '100%'})`
          }} 
        />
        
        <button 
          className={`view-filter-btn ${mode === 'spaces' ? 'active' : ''}`}
          onClick={() => setViewMode('spaces')}
        >
          <LayoutGrid size={14} />
          <span>Spaces</span>
        </button>
 
        <button 
          className={`view-filter-btn ${mode === 'tabs' ? 'active' : ''}`}
          onClick={() => setViewMode('tabs')}
        >
          <FileText size={14} />
          <span>Standalone</span>
        </button>
      </div>
    </div>
  );
};
