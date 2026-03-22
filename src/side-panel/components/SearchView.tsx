import { useState } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { searchResults, isLoading, error } from '../store';


export const SearchView = () => {
  const [query, setQuery] = useState('');

  const handleSearch = async (e?: Event) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    isLoading.value = true;
    try {
      const results = await sendToSW<any[]>({
        type: 'SEMANTIC_SEARCH',
        payload: { query: query.trim() }
      } as any);
      searchResults.value = results || [];
    } catch (err) {
      console.error('Search failed:', err);
      error.value = 'Search failed. Check your connection to the background worker.';
    } finally {

      isLoading.value = false;
    }
  };

  return (
    <div className="view-container">
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search your highlights..."
          className="input-glass"
        />
        <button 
          type="submit"
          disabled={isLoading.value}
          onClick={handleSearch}
          className="btn-primary"
        >
          {isLoading.value ? '...' : 'Search'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {searchResults.value.map((res, i) => (
          <div key={i} className="card">
            <p style={{ margin: 0, fontSize: '0.9em' }}>{res.text}</p>
            {res.score && <small className="text-dim">Score: {res.score.toFixed(3)}</small>}
          </div>
        ))}

        {searchResults.value.length === 0 && !isLoading.value && query.trim() !== '' && (
          <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9em' }}>No results found.</p>
        )}
      </div>
    </div>
  );
};
