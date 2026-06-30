import { useEffect } from 'preact/hooks';
import { allBookmarks, loadBookmarks, removeBookmark, navigateToBookmark } from '../store';

export function BookmarksPanel() {
  useEffect(() => {
    loadBookmarks();
  }, []);

  const bookmarks = allBookmarks.value;

  // Group by page title
  const grouped: Record<string, { title: string; url: string; items: any[] }> = {};
  bookmarks.forEach(b => {
    const key = b.url;
    if (!grouped[key]) {
      grouped[key] = { title: b.title || 'Untitled', url: b.url, items: [] };
    }
    grouped[key].items.push(b);
  });
  const groups = Object.entries(grouped);

  if (bookmarks.length === 0) {
    return (
      <div className="bookmarks-empty bento-card glass" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🔖</div>
        <p style={{ margin: 0, fontWeight: 600, opacity: 0.7 }}>No bookmarks yet</p>
        <span style={{ fontSize: '12px', opacity: 0.4, marginTop: '4px', display: 'block' }}>
          Select text on any page and click 🔖 to bookmark your position.
        </span>
      </div>
    );
  }

  return (
    <div className="bookmarks-panel" style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>🔖 Bookmarks</h2>
        <span style={{ fontSize: '12px', opacity: 0.5 }}>{bookmarks.length} saved</span>
      </div>

      {groups.map(([url, group]) => (
        <div key={url} className="bookmark-group" style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase' as const,
            opacity: 0.4,
            letterSpacing: '0.05em',
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap' as const,
          }}>
            {group.title}
          </div>

          {group.items.map((bookmark: any) => (
            <div
              key={bookmark.id}
              className="glass-card card bookmark-card"
              style={{
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
              onClick={() => navigateToBookmark(bookmark)}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '16px',
              }}>
                🔖
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap' as const,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: 0.9,
                }}>
                  {bookmark.anchorExact
                    ? `"${bookmark.anchorExact.slice(0, 60)}${bookmark.anchorExact.length > 60 ? '...' : ''}"`
                    : `Scroll position ${Math.round(bookmark.scrollYPercent * 100)}%`
                  }
                </div>
                <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </div>
              </div>

              <button
                className="btn-icon-only"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this bookmark?')) {
                    removeBookmark(bookmark.id);
                  }
                }}
                title="Delete bookmark"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  opacity: 0.4,
                  transition: 'opacity 0.2s',
                  fontSize: '14px',
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
