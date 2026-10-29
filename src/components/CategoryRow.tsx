import React from 'react';
import { Shirt, Sparkles, Baby, Flame, Headphones, Tag } from 'lucide-react';
import { Category } from '../types';

interface CategoryRowProps {
  categories: Category[];
  selectedCategorySlug?: string | null;
  onSelectCategory: (slug: string) => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
}) => {
  // Map icon strings to Lucide components if needed
  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'shirt':
        return <Shirt className="w-6 h-6 text-emerald-900" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6 text-emerald-900" />;
      case 'baby':
        return <Baby className="w-6 h-6 text-emerald-900" />;
      case 'flame':
        return <Flame className="w-6 h-6 text-emerald-900" />;
      case 'headphones':
        return <Headphones className="w-6 h-6 text-emerald-900" />;
      default:
        return <Tag className="w-6 h-6 text-emerald-900" />;
    }
  };

  // Sort by display order
  const displayCategories = [...categories].sort((a, b) => a.display_order - b.display_order);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Shop by Category
        </h2>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Explore curated collections
        </span>
      </div>

      {/* ONE Horizontal Row on Mobile with Smooth Scrolling and Snapping */}
      <div className="flex items-start gap-4 sm:gap-8 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory">
        {displayCategories.map((cat) => {
          const isSelected = selectedCategorySlug === cat.slug;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="flex flex-col items-center gap-2 group flex-shrink-0 snap-center focus:outline-none w-[76px] sm:w-[94px] text-center"
              aria-label={`Category ${cat.name}`}
            >
              {/* Circular Icon / Category Image with Gold Ring */}
              <div
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 transition-all duration-300 ${
                  isSelected
                    ? 'ring-4 ring-amber-400 scale-105 shadow-md'
                    : 'group-hover:scale-105 group-hover:ring-2 group-hover:ring-amber-300'
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-emerald-50 border-2 border-white shadow-sm flex items-center justify-center">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    getIcon(cat.icon)
                  )}
                </div>

                {/* Micro Category Icon Overlay */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#093824] text-amber-300 border-2 border-white flex items-center justify-center shadow-sm">
                  {React.cloneElement(getIcon(cat.icon), { className: 'w-3 h-3 text-amber-300' })}
                </div>
              </div>

              {/* Category Name Below Circular Icon */}
              <span
                className={`text-xs font-semibold tracking-tight transition-colors line-clamp-2 ${
                  isSelected
                    ? 'text-[#093824] font-bold'
                    : 'text-slate-800 group-hover:text-[#093824]'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
