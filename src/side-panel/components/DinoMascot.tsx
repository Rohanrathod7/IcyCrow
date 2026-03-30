import { AppStatus } from '../store';
import textBubbleImg from '../../assets/images/text_bubble.png';

export const DinoMascot = ({ status }: { status: AppStatus }) => {
  // Mapping statuses to the correct animations
  const isDancing = status === 'idle' || status === 'success';
  const isThinking = status === 'thinking';
  
  return (
    <div 
      className={`dino-view ${isDancing ? 'dino-dance' : ''} ${isThinking ? 'thinking' : ''}`} 
      aria-label={`Dino Mascot (Status: ${status})`}
    >
      {isThinking && (
        <img 
          src={textBubbleImg} 
          className="thinking-bubble" 
          alt="Thinking..."
        />
      )}
    </div>
  );
};
