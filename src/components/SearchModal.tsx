import React, { useState, useEffect } from 'react';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-emerald-800 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search kurtas, shawls, earbuds, perfumes, accessories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-lg"
          >
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-800 mb-2" />
              <span className="text-xs">Searching ATAL product catalog...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Matching Products ({results.length})
              </p>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={product.images?.[0] || '/icon.svg'}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                        {product.brand}
                      </span>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-[#093824]">
                        {product.name}
                      </h4>
                      <span className="text-xs font-bold text-[#093824] tabular-nums">
                        Rs. {product.sale_price.toLocaleString('en-PK')}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#093824] transition shrink-0" />
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No products found for "<strong className="text-slate-800">{query}</strong>". Try searching for "kurta", "earbuds", or "perfume".
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Type keywords above to instantly search ATAL STORE products.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
