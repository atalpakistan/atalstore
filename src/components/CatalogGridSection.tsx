import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from './ProductCard';

interface CatalogGridSectionProps {
  categories: Category[];
  initialCategorySlug?: string | null;
  onSelectProduct: (product: Product) => void;
}

export const CatalogGridSection: React.FC<CatalogGridSectionProps> = ({
  categories,
  initialCategorySlug,
  onSelectProduct,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [priceSort, setPriceSort] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sync initialCategorySlug when prop changes
  useEffect(() => {
    if (initialCategorySlug !== undefined) {
      setSelectedCategory(initialCategorySlug || '');
      setSelectedSubcategory('');
      setPage(1);
    }
  }, [initialCategorySlug]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  const fetchCatalog = async (resetPage = false) => {
    setLoading(true);
    const targetPage = resetPage ? 1 : page;
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
      if (maxPriceFilter) params.set('max_price', String(maxPriceFilter));
      params.set('sort', priceSort);
      params.set('page', String(targetPage));
      params.set('limit', '12');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        if (resetPage) setPage(1);
      }
    } catch {
      // Graceful error fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog(true);
  }, [selectedCategory, selectedSubcategory, priceSort, maxPriceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCatalog(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setPriceSort('newest');
    setMaxPriceFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedCategory || selectedSubcategory || maxPriceFilter || priceSort !== 'newest');

  return (
    <section id="catalog-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Verified Pakistani Marketplace
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Shop All Products
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Showing <span className="font-semibold text-slate-800 tabular-nums">{totalCount}</span> genuine products available nationwide
          </p>
        </div>

        {/* Sort & Quick Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}

          <div className="relative">
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as any)}
              className="appearance-none bg-white border border-slate-300 text-slate-800 text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Ribbon: Search + Category Buttons */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-6 flex flex-col gap-3">
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name, brand, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#093824] hover:bg-[#062819] text-amber-300 text-xs sm:text-sm font-semibold rounded-xl transition shadow"
          >
            Search
          </button>
        </form>

        {/* Category Pills (Button filters) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedSubcategory('');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === ''
                ? 'bg-[#093824] text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.slug === selectedCategory ? '' : c.slug);
                setSelectedSubcategory('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.slug
                  ? 'bg-[#093824] text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Subcategories Ribbon if category selected */}
        {activeCategoryObj && activeCategoryObj.subcategories && activeCategoryObj.subcategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase">Subcategories:</span>
            {activeCategoryObj.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(selectedSubcategory === sub.slug ? '' : sub.slug)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                  selectedSubcategory === sub.slug
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid: Strict 2 columns on Mobile, 3 on Tablet, 4 on Desktop */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#093824] mb-3" />
          <p className="text-sm">Fetching verified products from ATAL database...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <p className="text-base font-semibold text-slate-800 mb-1">No products found matching your filter</p>
          <p className="text-xs text-slate-500 mb-4">Try clearing active search or selecting another category.</p>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-[#093824] text-amber-300 text-xs font-semibold rounded-lg hover:bg-emerald-900 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
              fetchCatalog();
            }}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
          >
            &larr; Previous
          </button>

          <span className="text-xs font-medium text-slate-600 px-3">
            Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
              fetchCatalog();
            }}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </section>
  );
};
