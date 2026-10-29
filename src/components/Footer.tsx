import React, { useState } from 'react';
import {
  Truck, ShieldCheck, Mail, Clock, MessageSquare,
  Facebook, Instagram, ChevronRight, X, Lock, KeyRound, Check
} from 'lucide-react';
import { StoreSettings } from '../types';
import { useAuth } from '../context/AuthContext';

interface FooterProps {
  settings?: StoreSettings | null;
  onNavigateCategory: (slug: string) => void;
  onOpenTracking: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigateCategory,
  onOpenTracking,
}) => {
  const { login } = useAuth();
  const [activePolicyModal, setActivePolicyModal] = useState<{ title: string; content: string } | null>(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  const logoUrl = settings?.footer_logo_url || '/assets/aistudio/WhatsApp_Image_2026-09-29_at_12.21.56_PM_187de251.jpeg';
  const desc = settings?.footer_description || 'ATAL – Shop Smart. Live Better. 🛍️\nYour trusted online store for beauty, cosmetics, perfumes, fashion & electronics—quality products, stylish choices, and easy shopping, all in one place. ✨';

  const openPolicy = (title: string, contentKey: keyof StoreSettings) => {
    const content = (settings?.[contentKey] as string) || 'Policy details are being updated.';
    setActivePolicyModal({ title, content });
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    setAdminLoggingIn(true);
    const res = await login(adminEmail, adminPassword);
    if (!res.success) {
      setAdminLoginError(res.error || 'Invalid admin or staff credentials');
    } else {
      setShowAdminLoginModal(false);
      setAdminPassword('');
    }
    setAdminLoggingIn(false);
  };

  return (
    <footer className="bg-[#052215] text-slate-300 border-t border-emerald-950/80 pt-14 pb-20 md:pb-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-emerald-900/60">
          
          {/* Col 1: Brand Info & Guarantees */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="ATAL STORE" className="w-10 h-10 object-contain drop-shadow" />
              <div>
                <span className="font-display font-bold text-2xl text-amber-300">
                  ATAL<span className="text-white font-light text-lg ml-1">STORE</span>
                </span>
                <p className="text-[10px] text-emerald-300 tracking-wider uppercase font-semibold">
                  {settings?.tagline || 'Smart Shop. Live Better'}
                </p>
              </div>
            </div>

            <p className="text-emerald-100/80 text-xs leading-relaxed max-w-sm whitespace-pre-line">
              {desc}
            </p>

            {/* Nationwide Badge */}
            <div className="flex items-center gap-2 p-3 bg-emerald-950/80 rounded-2xl border border-emerald-800/40 text-emerald-200">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <span>100% Guaranteed Authentic Pakistani Products & Swift TCS / Leopard Courier Fulfillment</span>
            </div>

            {/* Social Media Links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 mb-2.5">
                Connect With ATAL
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href={settings?.social_facebook || 'https://www.facebook.com/share/1DgG52novy/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ATAL on Facebook"
                  className="w-8 h-8 rounded-xl bg-emerald-950/90 border border-emerald-800/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition shadow-sm"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={settings?.social_instagram || 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ATAL on Instagram"
                  className="w-8 h-8 rounded-xl bg-emerald-950/90 border border-emerald-800/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-gradient-to-tr hover:from-amber-600 hover:via-rose-600 hover:to-purple-600 hover:border-rose-500 transition shadow-sm"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={settings?.social_tiktok || 'https://www.tiktok.com/@atal.pakistan'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="ATAL on TikTok"
                  className="w-8 h-8 rounded-xl bg-emerald-950/90 border border-emerald-800/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-black hover:border-slate-600 transition shadow-sm"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.83 4.47 6.27 6.27 0 0 0 1.96-4.46V8.92a8.28 8.28 0 0 0 4.8 1.51V7c-.338-.002-.676-.046-1-.13v-.18z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Shop Categories */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-4">
              Shop Collections
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigateCategory('men')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                  <span>Men's Fashion & Watches</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('women')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                  <span>Women's Pret & Shawls</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('kids')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                  <span>Kids & Festive Outfits</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('cosmetics-perfume')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                  <span>Royal Oud & Cosmetics</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('electronics')}
                  className="hover:text-amber-300 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-emerald-600" />
                  <span>Earbuds & Tech Gadgets</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Policies */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-4">
              Customer Support
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button onClick={onOpenTracking} className="hover:text-amber-300 transition text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Nationwide Order</span>
                </button>
              </li>
              <li>
                <button onClick={() => openPolicy('Shipping & Delivery Policy', 'policy_shipping')} className="hover:text-amber-300 transition">
                  Shipping & Courier Policy
                </button>
              </li>
              <li>
                <button onClick={() => openPolicy('7-Day Returns & Exchanges', 'policy_return')} className="hover:text-amber-300 transition">
                  Return & Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => openPolicy('Privacy & Security Policy', 'policy_privacy')} className="hover:text-amber-300 transition">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => openPolicy('Terms and Conditions', 'policy_terms')} className="hover:text-amber-300 transition">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => openPolicy('Frequently Asked Questions', 'faq_content')} className="hover:text-amber-300 transition">
                  Help & FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Admin Portal Link */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-4">
              Helpline & Portal
            </h4>
            <div className="space-y-3 text-emerald-100/80">
              {(() => {
                const whatsappRaw = String(settings?.support_whatsapp || '03719150297');
                const whatsappDigits = whatsappRaw.replace(/\D/g, '').replace(/^0/, '');
                const emailRaw = String(settings?.support_email || 'contact.to.atal@gmail.com');
                const hoursRaw = String(settings?.support_hours || 'Mon – Sat: 9:00 AM – 9:00 PM PKT');

                return (
                  <>
                    <a
                      href={`https://wa.me/92${whatsappDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2.5 hover:text-emerald-300 transition group"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                      <div>
                        <p className="font-semibold text-white group-hover:text-amber-300 transition">
                          {whatsappRaw}
                        </p>
                        <p className="text-[10px] text-emerald-400">WhatsApp Order Support (Click to Chat)</p>
                      </div>
                    </a>

                    <a
                      href={`mailto:${emailRaw}`}
                      className="flex items-start gap-2.5 hover:text-amber-300 transition group"
                    >
                      <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                      <div>
                        <p className="font-semibold text-white group-hover:text-amber-300 transition">
                          {emailRaw}
                        </p>
                        <p className="text-[10px] text-emerald-400">Official Inquiries & Support</p>
                      </div>
                    </a>

                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[11px]">{hoursRaw}</p>
                    </div>

                    <div className="pt-3">
                      <button
                        onClick={() => setShowAdminLoginModal(true)}
                        className="w-full py-2 px-3 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold rounded-xl border border-emerald-800/80 flex items-center justify-center gap-1.5 transition shadow"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Admin / Staff Portal Login</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Verified Gateways */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-emerald-300/70">
          <div>
            &copy; {new Date().getFullYear()} ATAL STORE. All rights reserved. {settings?.tagline || 'Smart Shop. Live Better'}.
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium text-emerald-200">Verified Payment Gateways:</span>
            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded font-bold text-amber-300">
              COD
            </span>
            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded font-bold text-rose-400">
              JazzCash
            </span>
            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded font-bold text-emerald-400">
              Easypaisa
            </span>
            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded font-bold text-cyan-300">
              HBL Bank
            </span>
          </div>
        </div>

      </div>

      {/* Admin Login Modal (Triggered exclusively from Footer) */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#093824]" />
                <h3 className="font-display text-base font-bold text-slate-950">
                  Admin & Staff Portal Login
                </h3>
              </div>
              <button
                onClick={() => setShowAdminLoginModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff / Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  placeholder="Enter staff / admin email"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              {adminLoginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-medium">
                  {adminLoginError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoggingIn}
                  className="px-4 py-2 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold rounded-xl shadow transition"
                >
                  {adminLoggingIn ? 'Signing In...' : 'Access Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policy Content Modal */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white text-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[80vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {activePolicyModal.title}
              </h3>
              <button
                onClick={() => setActivePolicyModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs leading-relaxed text-slate-600 whitespace-pre-line space-y-2">
              {activePolicyModal.content}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setActivePolicyModal(null)}
                className="px-4 py-2 bg-[#093824] text-amber-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
