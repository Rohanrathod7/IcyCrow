import { activeView, type ViewType } from '../store';

export const NavBar = () => {
  const views: { id: ViewType; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'search', label: 'Search' },
    { id: 'spaces', label: 'Spaces' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <nav style={{ display: 'flex', gap: '8px', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => activeView.value = view.id}
          style={{
            background: activeView.value === view.id ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: '4px'
          }}
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
};
