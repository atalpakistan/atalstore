import React, { useState } from 'react';
import {
  ArrowLeft, ShieldCheck, Truck, Lock, CreditCard, Banknote,
  CheckCircle2, AlertCircle, Tag, Loader2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StoreSettings } from '../types';

interface CheckoutPageProps {
  settings?: StoreSettings | null;
  onBack: () => void;
  onOrderSuccess: (orderId: string) => void;
}

const PAKISTAN_PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir'
];

const POPULAR_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur', 'Sargodha', 'Abbottabad'
];

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  settings,
  onBack,
  onOrderSuccess,
}) => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState('Punjab');
  const [city, setCity] = useState('Lahore');
  const [area, setArea] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'jazzcash' | 'easypaisa' | 'hbl'>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Shipping rules (Free over Rs. 9,999, Rs. 290 standard delivery fee)
  const freeThreshold = settings?.free_shipping_threshold || 9999;
  const defaultFee = settings?.default_shipping_fee || 290;
  const shippingFee = subtotal >= freeThreshold ? 0 : defaultFee;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal })
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: data.code, discount: data.discount });
        setCouponError('');
      }
    } catch {
      setCouponError('Network error checking coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Phone validation for Pakistan
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const pkPhoneRegex = /^(\+92|0092|92|0)?3[0-9]{9}$/;
    if (!pkPhoneRegex.test(cleanPhone)) {
      setSubmitError('Please enter a valid Pakistani mobile number (e.g. 0300 1234567 or +923001234567)');
      return;
    }

    if (!fullName.trim() || !streetAddress.trim() || !city.trim() || !province.trim()) {
      setSubmitError('Please fill in all required shipping address fields.');
      return;
    }

    if (!transactionId.trim()) {
      setSubmitError('Transaction ID / Receipt Number is mandatory for order verification.');
      return;
    }

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add products before checking out.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🛍️ [Checkout Cart Audit] Submitting items to /api/orders:', items.map(it => ({
        product_id: it.product_id,
        name: it.product?.name,
        unit_price: it.unit_price,
        total_price: it.total_price,
        quantity: it.quantity,
        variant_id: it.variant_id
      })));

      // 1. Submit Order to transactional backend
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: user?.id,
          customer_name: fullName.trim(),
          customer_email: email.trim() || null,
          phone: cleanPhone,
          province,
          city,
          area: area.trim() || city,
          street_address: streetAddress.trim(),
          landmark: landmark.trim() || null,
          order_notes: orderNotes.trim() || null,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim(),
          coupon_code: appliedCoupon?.code || null,
          items: items.map((it) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unit_price || (it.total_price ? it.total_price / qty : 0) || it.product?.sale_price || 0);
            const pid = it.product_id || it.product?.id;
            const vid = it.variant_id || it.variant?.id;
            const img = it.variant?.image_url || it.product?.images?.[0] || '/icon.svg';
            const pname = it.product?.name || 'Product';
            const vtitle = it.variant ? `${it.variant.color_name || ''} ${it.variant.size || ''}`.trim() : undefined;

            if (price <= 0) {
              console.warn(`⚠️ [Checkout Warning] Item ${pname} has zero or invalid unit price:`, it);
            }
            return {
              product_id: pid,
              product_name: pname,
              variant_id: vid,
              variant_title: vtitle,
              quantity: qty,
              unit_price: price,
              image_url: img,
            };
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to process order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const orderId = String(data.orderId || data.order?.orderId || data.order?.id || data.order?.order_id || '');
      if (!orderId) {
        setSubmitError('Failed to retrieve order reference number. Please check your SMS or contact support.');
        setIsSubmitting(false);
        return;
      }

      // Cache placed order payload locally for instantaneous, zero-delay rendering on confirmation page
      try {
        const orderData = data.order || data;
        if (orderData) {
          sessionStorage.setItem(`atal_order_${orderId}`, JSON.stringify(orderData));
        }
      } catch {
        // Ignored
      }

      // 2. If Cash on Delivery, complete immediately
      if (paymentMethod === 'cod') {
        clearCart();
        onOrderSuccess(orderId);
        return;
      }

      // 3. If JazzCash or Easypaisa, initiate payment flow
      const payRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, gateway: paymentMethod })
      });

      const payData = await payRes.json();
      if (payData.isSandbox) {
        // Safe automated test mode simulation for evaluation & testing
        const confirmRes = await fetch('/api/payments/test-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, gateway: paymentMethod, status: 'success' })
        });
        if (confirmRes.ok) {
          clearCart();
          onOrderSuccess(orderId);
          return;
        }
      }

      // If live merchant integration, auto-submit POST form
      if (payData.endpoint && payData.payload) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payData.endpoint;
        for (const [k, v] of Object.entries(payData.payload)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = String(v);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        clearCart();
        form.submit();
      } else {
        clearCart();
        onOrderSuccess(orderId);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error communicating with checkout server');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">Your Bag is Empty</h2>
        <p className="text-sm text-slate-500 mb-6">Please add items from the ATAL collection to proceed with checkout.</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl hover:bg-[#062819] transition"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#093824] bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shopping</span>
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>256-Bit SSL Encrypted Checkout</span>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Customer Contact Info */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>1. Contact & Customer Details</span>
              <span className="text-xs font-normal text-slate-400">Step 1 of 3</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Zeeshan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pakistani Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Courier will send tracking SMS and call upon delivery
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address (Optional, for Invoice receipt)
              </label>
              <input
                type="email"
                placeholder="e.g. customer@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Section 2: Pakistan Delivery Address */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>2. Delivery Address (Pakistan)</span>
              <span className="text-xs font-normal text-slate-400">Step 2 of 3</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Province / Territory <span className="text-rose-500">*</span>
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                >
                  {PAKISTAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="city-suggestions"
                  placeholder="e.g. Lahore, Karachi, Islamabad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                />
                <datalist id="city-suggestions">
                  {POPULAR_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area / Sector / Colony <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DHA Phase 5, Gulberg III, F-7"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near PSO Pump or Main Mosque"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Complete Street Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="House / Apartment number, Street name, Building"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Special Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Please deliver after 2:00 PM"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#093824] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Section 3: Pakistani Payment Method & Account Transfer Info */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>3. Payment Method & Account Transfer</span>
              <span className="text-xs font-normal text-slate-400">Step 3 of 3</span>
            </h2>

            <div className="space-y-3">
              {/* COD Option */}
              <label
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'cod'
                    ? 'border-[#093824] bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#093824]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-800" />
                      Cash on Delivery (COD) — Advance Delivery Fee (Rs. 290) Required
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      Courier Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Advance payment of Rs. 290 delivery charges is mandatory via JazzCash, Easypaisa, or HBL before dispatch. Balance payable on delivery.
                  </p>
                </div>
              </label>

              {/* JazzCash Option */}
              <label
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'jazzcash'
                    ? 'border-[#093824] bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'jazzcash'}
                  onChange={() => setPaymentMethod('jazzcash')}
                  className="mt-1 accent-[#093824]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-rose-600" />
                      JazzCash Mobile Transfer
                    </span>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                      QR Code Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Transfer full amount to Omar Farooq (03227796097) and enter Transaction ID below.
                  </p>
                </div>
              </label>

              {/* Easypaisa Option */}
              <label
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'easypaisa'
                    ? 'border-[#093824] bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'easypaisa'}
                  onChange={() => setPaymentMethod('easypaisa')}
                  className="mt-1 accent-[#093824]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Easypaisa Mobile Transfer
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      QR Code Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Transfer full amount to Omar Farooq (03227796097) and enter Transaction ID below.
                  </p>
                </div>
              </label>

              {/* HBL Bank Transfer Option */}
              <label
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition ${
                  paymentMethod === 'hbl'
                    ? 'border-[#093824] bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'hbl'}
                  onChange={() => setPaymentMethod('hbl')}
                  className="mt-1 accent-[#093824]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                      HBL Bank Transfer
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                      Direct Deposit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Transfer to Umer Farooq (50627918149903) and enter Transaction ID below.
                  </p>
                </div>
              </label>
            </div>

            {/* Account Details & QR Code display based on selected payment method */}
            {paymentMethod !== 'cod' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {paymentMethod === 'jazzcash' && 'JazzCash Account & QR Code'}
                    {paymentMethod === 'easypaisa' && 'Easypaisa Account & QR Code'}
                    {paymentMethod === 'hbl' && 'HBL Bank Account & QR Code'}
                  </h4>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    Scan or Send Amount & Copy Transaction ID
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5 text-xs text-slate-700 font-mono bg-white p-3 rounded-xl border">
                    <div><span className="text-slate-400">Account Title:</span> <strong className="text-slate-900">
                      {paymentMethod === 'hbl' ? 'Umer Farooq' : 'Omar Farooq'}
                    </strong></div>
                    <div><span className="text-slate-400">Account Number:</span> <strong className="text-[#093824]">
                      {paymentMethod === 'hbl' ? '50627918149903' : '03227796097'}
                    </strong></div>
                    <div className="text-[11px] text-slate-500 font-sans pt-1">
                      {paymentMethod === 'hbl' ? 'Habib Bank Limited (HBL) Pakistan' : 'JazzCash / Easypaisa Mobile Account'}
                    </div>
                  </div>

                  <div className="flex justify-center bg-white p-2 rounded-xl border">
                    <img
                      src={
                        paymentMethod === 'jazzcash'
                          ? '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.26.22_PM_96ced8c4.jpeg'
                          : paymentMethod === 'easypaisa'
                          ? '/assets/aistudio/WhatsApp_Image_2026-10-20_at_11.24.41_PM_3cd4a1f7.jpeg'
                          : '/assets/aistudio/WhatsApp_Image_2026-10-22_at_9.45.39_AM_5e21af89.jpeg'
                      }
                      alt="Payment QR Code"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* COD Advance Delivery Payment Notice */}
            {paymentMethod === 'cod' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 mt-4 text-xs">
                <p className="font-bold text-amber-900">COD Advance Delivery Fee Transfer Details (Rs. 290):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 font-mono bg-white p-3 rounded-xl border border-amber-200/60">
                  <div><span className="text-slate-400">JazzCash / Easypaisa:</span> <strong className="text-slate-900">03227796097</strong> (Omar Farooq)</div>
                  <div><span className="text-slate-400">HBL Bank:</span> <strong className="text-slate-900">50627918149903</strong> (Umer Farooq)</div>
                </div>
                <p className="text-[11px] text-amber-800">
                  Please transfer Rs. 290 for advance courier charges and enter your Transaction ID below to verify your COD order.
                </p>
              </div>
            )}

            {/* Mandatory Transaction ID input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Transaction ID / Receipt Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TID-98273919 or 382910298"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-emerald-900/40 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#093824] bg-white"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Mandatory for order verification. Enter the transaction reference from your bank/wallet SMS or receipt.
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary & Placement CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-5 sticky top-24">
            <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>

            {/* Compact items list */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {items.map((item) => {
                const qty = Math.max(1, Number(item.quantity || 1));
                const unitPrice = Number(item.unit_price || item.product?.sale_price || (item.total_price ? item.total_price / qty : 0));
                const itemTotal = Number(item.total_price) || (unitPrice * qty);

                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.variant?.image_url || item.product?.images?.[0] || '/icon.svg'}
                        alt={item.product?.name || 'Product'}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 truncate">{item.product?.name || 'Product'}</p>
                        <p className="text-slate-500 text-[11px]">
                          Qty: {qty} {item.variant?.color_name && `· ${item.variant.color_name}`}
                          {unitPrice > 0 && ` · Rs. ${unitPrice.toLocaleString('en-PK')}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums shrink-0">
                      Rs. {itemTotal.toLocaleString('en-PK')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Coupon Code Box */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Coupon code (e.g. ATAL10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-[#093824]"
                  />
                </div>
                <button
                  type="button"
                  disabled={couponLoading || !couponCode.trim()}
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  {couponLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>

              {couponError && (
                <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{couponError}</span>
                </p>
              )}

              {appliedCoupon && (
                <div className="mt-2 p-2 bg-emerald-50 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-semibold border border-emerald-200">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Coupon '{appliedCoupon.code}' Applied!
                  </span>
                  <span className="tabular-nums">- Rs. {(appliedCoupon.discount ?? 0).toLocaleString('en-PK')}</span>
                </div>
              )}
            </div>

            {/* Calculation Breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  Rs. {(subtotal ?? 0).toLocaleString('en-PK')}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span className="tabular-nums">- Rs. {(discountAmount ?? 0).toLocaleString('en-PK')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  Delivery Charges
                </span>
                <span className={`font-semibold tabular-nums ${shippingFee === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee}`}
                </span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-[#093824] pt-3 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="tabular-nums text-lg">
                  Rs. {(finalTotal ?? 0).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Confirm & Place Order CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-sm sm:text-base rounded-2xl shadow-xl transition flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  <span>Confirm Order (Rs. {finalTotal.toLocaleString('en-PK')})</span>
                </>
              )}
            </button>

            <div className="text-center text-[11px] text-slate-400 pt-1">
              By confirming, you agree to ATAL STORE's Terms of Trade & Delivery Terms in Pakistan.
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
