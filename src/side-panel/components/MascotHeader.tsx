import { currentAppStatus } from '../store';
import { Bird, CheckCircle } from 'lucide-preact';

export const MascotHeader = () => {
  const status = currentAppStatus.value;
  
  let animationClass = '';
  let colorClass = 'text-gray-400';
  let bgColorClass = 'bg-gray-800/30';

  if (status === 'saving') {
    animationClass = 'animate-bounce';
    colorClass = 'text-blue-500';
    bgColorClass = 'bg-blue-900/20';
  } else if (status === 'thinking') {
    animationClass = 'animate-pulse';
    colorClass = 'text-purple-500';
    bgColorClass = 'bg-purple-900/20';
  } else if (status === 'success') {
    colorClass = 'text-emerald-500';
    bgColorClass = 'bg-emerald-900/20';
  }

  return (
    <div className={`mascot-header ${bgColorClass}`}>
      <div 
        className={`mascot-icon-container ${colorClass} ${animationClass}`}
        data-testid="mascot-icon"
      >
        {status === 'success' ? (
          <CheckCircle size={48} strokeWidth={1.5} />
        ) : (
          <Bird size={48} strokeWidth={1.5} />
        )}
      </div>
      <div className="mascot-text">
        {status === 'idle' ? 'Ready' : status === 'saving' ? 'Saving Space...' : status === 'thinking' ? 'Processing...' : 'Success!'}
      </div>
    </div>
  );
};
