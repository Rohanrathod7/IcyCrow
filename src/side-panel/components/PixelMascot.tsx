import { AppStatus } from '../store';

export const PixelMascot = ({ status }: { status: AppStatus }) => {
  const isSaving = status === 'saving';
  const isThinking = status === 'thinking';
  const isSuccess = status === 'success';

  return (
    <div className="pixel-mascot-container">
      <svg
        width="64"
        height="64"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        shape-rendering="crispEdges"
        className={isSuccess ? 'animate-bounce' : ''}
      >
        {/* Shadow */}
        <rect x="8" y="26" width="16" height="2" fill="rgba(0,0,0,0.1)" />
        
        {/* Legs (Blocky) */}
        {!isSaving ? (
          <>
            <rect x="10" y="24" width="3" height="2" fill="#ea580c" />
            <rect x="19" y="24" width="3" height="2" fill="#ea580c" />
          </>
        ) : (
          <>
            <rect x="6" y="24" width="3" height="2" fill="#ea580c" />
            <rect x="23" y="24" width="3" height="2" fill="#ea580c" />
          </>
        )}

        {/* Body (Orange Box) */}
        {!isSaving ? (
          <rect x="8" y="10" width="16" height="14" fill="#f97316" />
        ) : (
          <rect x="6" y="16" width="20" height="8" fill="#f97316" />
        )}

        {/* Eyes (Spec-driven) */}
        {isSaving ? (
          <>
            {/* - - eyes */}
            <rect x="10" y="20" width="4" height="1" fill="#431407" />
            <rect x="18" y="20" width="4" height="1" fill="#431407" />
          </>
        ) : (
          <>
            {/* Dot eyes for idle/thinking/success */}
            <rect x="11" y="15" width="2" height="2" fill="#431407" />
            <rect x="19" y="15" width="2" height="2" fill="#431407" />
          </>
        )}

        {/* Mouth/Expression */}
        {isSuccess && (
          <rect x="13" y="19" width="6" height="1" fill="#431407" />
        )}
        {isThinking && (
          <rect x="15" y="19" width="2" height="2" fill="#431407" />
        )}
      </svg>
      
      {/* Spec Bubbles */}
      {isSaving && (
        <div className="pixel-bubble animate-pulse">
          Zzz
        </div>
      )}
      
      {isThinking && (
        <div className="pixel-bubble" style={{ transform: 'scale(1.2)' }}>
          !
        </div>
      )}
    </div>
  );
};
