import { activeView, type ViewType } from '../store';

export const NavBar = () => {
  const views: { id: ViewType; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'search', label: 'Search' },
    { id: 'chat', label: 'Chat' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'spaces', label: 'Spaces' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <nav className="navbar">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => activeView.value = view.id}
          className={`nav-btn ${activeView.value === view.id ? 'active' : ''}`}
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
};
