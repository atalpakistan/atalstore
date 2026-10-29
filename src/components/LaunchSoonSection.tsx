import React, { useState, useRef } from 'react';
import { Clock, Bell, Check, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { LaunchSoonProduct } from '../types';

interface LaunchSoonSectionProps {
  items: LaunchSoonProduct[];
  title?: string;
  subtitle?: string;
}

export const LaunchSoonSection: React.FC<LaunchSoonSectionProps> = ({
  items,
  title = 'Launch Soon',
  subtitle = 'Upcoming releases and limited capsule drops. Register for priority notification.',
}) => {
  const [selectedItem, setSelectedItem] = useState<LaunchSoonProduct | null>(null);
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !phoneOrEmail.trim()) return;

    setSubmitting(true);
    try {
      const isEmail = phoneOrEmail.includes('@');
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launch_soon_id: selectedItem.id,
          email: isEmail ? phoneOrEmail : undefined,
          phone: !isEmail ? phoneOrEmail : undefined,
        }),
      });
      if (res.ok) {
        setSuccessMessage(`You will receive a VIP alert when ${selectedItem.product_name} goes live!`);
        setTimeout(() => {
          setSelectedItem(null);
          setPhoneOrEmail('');
          setSuccessMessage('');
        }, 2800);
      }
    } catch {
      // Ignored
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-200">
      {/* Header with Navigation Controls */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Future Drops</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-[#093824] hover:text-amber-300 hover:border-[#093824] transition shadow-sm"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-[#093824] hover:text-amber-300 hover:border-[#093824] transition shadow-sm"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cards Single Row Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-1 snap-x snap-mandatory scroll-smooth"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[280px] sm:w-[320px] lg:w-[350px] flex-shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition"
          >
            <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
              <img
                src={item.image_url}
                alt={item.product_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div className="absolute top-3 left-3 bg-[#093824] text-amber-300 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md shadow-md border border-amber-400/40">
                {item.coming_soon_badge || 'Coming Soon'}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Expected: {item.expected_launch_date}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                  {item.product_name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                  {item.short_description}
                </p>
              </div>

              <button
                onClick={() => setSelectedItem(item)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-[#093824] text-slate-800 hover:text-amber-300 text-xs font-semibold rounded-xl border border-slate-200 hover:border-[#093824] transition duration-200"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notify Me on Launch</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reminder Registration Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="font-display text-xl font-bold text-slate-900 mb-1">
              Priority Launch Notification
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Get an instant SMS or email as soon as <strong className="text-slate-800">{selectedItem.product_name}</strong> is available for order in Pakistan.
            </p>

            {successMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2 text-xs font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Pakistani Mobile Number or Email
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0300 1234567 or name@domain.com"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 px-4 bg-[#093824] text-amber-300 text-xs font-bold rounded-xl hover:bg-emerald-900 transition shadow"
                  >
                    {submitting ? 'Registering...' : 'Register Alert'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
