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
    <div style={{ padding: '15px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search your highlights..."
          style={{ 
            flex: 1, 
            padding: '8px', 
            borderRadius: '4px', 
            border: '1px solid rgba(255,255,255,0.2)', 
            background: 'rgba(0,0,0,0.2)',
            color: 'white'
          }}
        />
        <button 
          type="submit"
          disabled={isLoading.value}
          onClick={handleSearch}
          style={{ 
            padding: '8px 15px', 
            borderRadius: '4px', 
            background: '#3a76f0', 
            color: 'white', 
            border: 'none',
            cursor: isLoading.value ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading.value ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {searchResults.value.map((res: any, i) => (
          <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <p style={{ margin: 0, fontSize: '0.9em' }}>{res.text}</p>
            {res.score && <small style={{ opacity: 0.5 }}>Score: {res.score.toFixed(3)}</small>}
          </div>
        ))}
        {searchResults.value.length === 0 && !isLoading.value && query.trim() !== '' && (
          <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9em' }}>No results found.</p>
        )}
      </div>
    </div>
  );
};
