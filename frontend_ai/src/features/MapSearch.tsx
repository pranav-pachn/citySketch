import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../entities/store/useStore';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { apiClient } from '../shared/api/apiClient';

export const MapSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { submitMapContext } = useStore();

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient.searchLocations(searchQuery);
      setResults(data);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleSelectLocation = async (location: any) => {
    setIsDropdownOpen(false);
    setQuery(location.name);
    await submitMapContext(location.boundingBox, location.name);
  };

  return (
    <div className="relative w-full">
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
          <Search size={16} />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
          placeholder="Search for a real-world location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setIsDropdownOpen(true)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {isDropdownOpen && results.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {results.map((result) => (
            <button
              key={result.id}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-none flex items-start gap-3 group"
              onClick={() => handleSelectLocation(result)}
            >
              <div className="mt-0.5 text-slate-500 group-hover:text-blue-500 transition-colors">
                <MapPin size={14} />
              </div>
              <div>
                <div className="font-medium text-slate-200 text-sm leading-tight">{result.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{result.type.replace('_', ' ')}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
