import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Heart, Star, Truck, ShieldCheck, RefreshCw, Share2,
  Check, AlertCircle, ShoppingBag, Zap, MessageCircle
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

interface ProductDetailPageProps {
  productSlugOrId: string;
  onBack: () => void;
  onNavigateProduct: (slug: string) => void;
  onBuyNow: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productSlugOrId,
  onBack,
  onNavigateProduct,
  onBuyNow,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${productSlugOrId}`);
        const data = await res.json();
        if (data.redirect_to) {
          const newSlug = data.redirect_to.replace('/product/', '');
          onNavigateProduct(newSlug);
          return;
        }
        if (!res.ok) {
          setError(data.error || 'Product not found');
          return;
        }
        setProduct(data.product);
        setRelated(data.related || []);
        setSelectedImageIndex(0);
        if (data.product.variants && data.product.variants.length > 0) {
          setSelectedVariant(data.product.variants[0]);
        } else {
          setSelectedVariant(null);
        }
        setQuantity(1);

        // Update document title for SEO
        document.title = `${data.product.name} — ATAL STORE Pakistan`;
      } catch (err: any) {
        setError(err.message || 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productSlugOrId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-800 border-t-amber-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Loading product details from ATAL database...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested product may have been relocated or is currently out of stock.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#093824] text-amber-300 font-semibold rounded-xl text-xs hover:bg-[#062819] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </button>
      </div>
    );
  }

  const rawImages = Array.isArray(product.images)
    ? product.images
    : typeof product.images === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(product.images);
            return Array.isArray(parsed) ? parsed : [product.images];
          } catch {
            return [product.images];
          }
        })()
      : [];
  const images = rawImages.filter((img) => typeof img === 'string' && img.trim().length > 0);
  if (images.length === 0) images.push('/icon.svg');

  const inWish = isInWishlist(product.id);

  // Safe numeric fallbacks
  const rating = typeof product.rating === 'number' && !isNaN(product.rating) ? product.rating : 5.0;
  const reviewsCount = typeof product.reviews_count === 'number' && !isNaN(product.reviews_count) ? product.reviews_count : 0;
  const salePrice = typeof product.sale_price === 'number' && !isNaN(product.sale_price) ? product.sale_price : 0;
  const originalPrice = typeof product.original_price === 'number' && !isNaN(product.original_price) ? product.original_price : salePrice;

  // Active pricing based on variant
  const currentPrice = selectedVariant?.price ?? salePrice;
  const hasDiscount = originalPrice > currentPrice;
  const discountPercent = hasDiscount && originalPrice > 0 ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

  const activeStock = selectedVariant ? selectedVariant.stock : (product.available_stock ?? 10);
  const isOutOfStock = activeStock <= 0;

  const handleColorSelect = (v: ProductVariant) => {
    setSelectedVariant(v);
    if (v.image_url) {
      // Find if image matches an existing gallery image or prepend
      const imgIdx = images.indexOf(v.image_url);
      if (imgIdx > -1) {
        setSelectedImageIndex(imgIdx);
      }
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Check out ${product.name} on ATAL STORE: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Back Navigation Bar & Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#093824] bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        {/* Share Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Purchase Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left: Interactive Media Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails Strip */}
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[540px] no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                    idx === selectedImageIndex
                      ? 'border-[#093824] ring-2 ring-[#093824]/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main Large Image Display */}
          <div className="flex-1 relative aspect-[4/5] sm:aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-md">
            <img
              src={selectedVariant?.image_url && selectedImageIndex === 0 ? selectedVariant.image_url : images[selectedImageIndex] || images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />

            {/* Discount Badge */}
            {hasDiscount && discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1 rounded-lg shadow-md">
                {discountPercent}% OFF
              </div>
            )}

            {/* Wishlist Button */}
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition shadow-md ${
                inWish
                  ? 'bg-rose-50 text-rose-500 border border-rose-200'
                  : 'bg-white/90 text-slate-700 hover:text-rose-500 hover:bg-white'
              }`}
              aria-label="Wishlist"
            >
              <Heart className={`w-5 h-5 ${inWish ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 flex flex-col gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
          
          {/* Header Info */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-bold tracking-wider uppercase text-emerald-800">
                {product.brand || 'ATAL'}
              </span>
              <span className="font-mono text-slate-400">
                SKU: {selectedVariant?.sku || product.sku}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {product.name}
            </h1>

            {/* Genuine Reviews Rating */}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
                <span className="font-bold text-slate-800 ml-1 tabular-nums">{rating.toFixed(1)}</span>
              </div>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-medium">({reviewsCount} verified customer reviews)</span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#093824] tabular-nums">
              Rs. {currentPrice.toLocaleString('en-PK')}
            </span>
            {hasDiscount && (
              <span className="text-sm sm:text-base text-slate-400 line-through tabular-nums">
                Rs. {originalPrice.toLocaleString('en-PK')}
              </span>
            )}
            <span className="ml-auto text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              Tax Included
            </span>
          </div>

          {/* Color & Size Variant Selectors */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Color Swatches */}
              {product.variants.some((v) => v.color_name) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Selected Color: <strong className="text-slate-900">{selectedVariant?.color_name || 'Standard'}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => handleColorSelect(variant)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                          selectedVariant?.id === variant.id
                            ? 'border-[#093824] bg-emerald-900 text-amber-300 font-bold shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {variant.color_code && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: variant.color_code }}
                          />
                        )}
                        <span>{variant.color_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selectors */}
              {product.variants.some((v) => v.size) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Selected Size: <strong className="text-slate-900">{selectedVariant?.size || 'Standard'}</strong>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium transition ${
                          selectedVariant?.id === variant.id
                            ? 'border-[#093824] bg-[#093824] text-amber-300 font-bold shadow-sm'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {variant.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stock Availability Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {isOutOfStock ? (
              <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                <AlertCircle className="w-4 h-4" />
                Currently Out of Stock
              </span>
            ) : activeStock <= 5 ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                <AlertCircle className="w-4 h-4" />
                Only {activeStock} items remaining in Pakistan warehouse!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <Check className="w-4 h-4" />
                In Stock & Ready for Rapid Nationwide Dispatch
              </span>
            )}
          </div>

          {/* Quantity and Primary Purchase CTAs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-bold text-slate-900 tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= activeStock}
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={isOutOfStock}
                onClick={() => addToCart(product, selectedVariant || undefined, quantity)}
                className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm rounded-2xl border border-slate-300 transition disabled:opacity-40"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                disabled={isOutOfStock}
                onClick={() => onBuyNow(product, selectedVariant || undefined, quantity)}
                className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs sm:text-sm rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
              >
                <Zap className="w-4 h-4 fill-amber-300" />
                <span>Buy Now</span>
              </button>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>Free delivery across Pakistan on orders above Rs. 3,000 (TCS / Leopard).</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>100% genuine brand authenticity guaranteed.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-emerald-800 shrink-0" />
              <span>7-day easy returns and exchanges for peace of mind.</span>
            </div>
          </div>

        </div>

      </div>

      {/* Description & Specifications Tabs */}
      <div className="mt-12 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm">
        <h3 className="font-display text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Product Details & Heritage
        </h3>
        <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed space-y-4">
          <p>{product.description}</p>
          {product.short_description && (
            <p className="font-medium text-slate-800">{product.short_description}</p>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <div className="mt-14">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mb-6">
            You May Also Like
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onNavigateProduct(rel.slug)}
                className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-between cursor-pointer group hover:shadow-lg transition"
              >
                <div className="aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 mb-2">
                  <img
                    src={rel.images?.[0] || '/icon.svg'}
                    alt={rel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800">{rel.brand}</span>
                  <h4 className="text-xs font-medium text-slate-900 line-clamp-1">{rel.name}</h4>
                  <p className="text-xs font-bold text-[#093824] tabular-nums mt-1">
                    Rs. {(rel.sale_price || 0).toLocaleString('en-PK')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
