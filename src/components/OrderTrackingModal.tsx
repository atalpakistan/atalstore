import React, { useState } from 'react';
import { X, Search, Truck, CheckCircle2, Clock, AlertCircle, Package } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_STEPS = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered'];

const formatPrice = (val?: number | string | null): string => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-PK');
};

const extractItemUnitPrice = (it: any): number => {
  const qty = Math.max(1, Number(it.quantity || 1));
  const candidates = [
    it.price,
    it.unit_price,
    it.total ? Number(it.total) / qty : 0,
    it.total_price ? Number(it.total_price) / qty : 0,
    it.sale_price,
    it.original_price,
    it.product?.sale_price,
    it.product?.price,
  ];
  for (const c of candidates) {
    const num = Number(c);
    if (!isNaN(num) && num > 0) return num;
  }
  return 0;
};

const extractItemTotal = (it: any): number => {
  const qty = Math.max(1, Number(it.quantity || 1));
  const candidates = [it.total, it.total_price];
  for (const c of candidates) {
    const num = Number(c);
    if (!isNaN(num) && num > 0) return num;
  }
  const uPrice = extractItemUnitPrice(it);
  return uPrice * qty;
};

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose }) => {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to locate order with provided details.');
      } else {
        setOrder(data);
      }
    } catch {
      setError('Network error tracking order');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIdx = order ? ORDER_STEPS.indexOf(order.order_status) : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-800" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
              Track Nationwide Order
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleTrackSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order Number or Courier Consignment # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ATL-582914 or TCS / Trax Consignment #"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#093824]"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Enter your official ATAL Order Number (e.g. ATL-XXXXXX) or your courier tracking number.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Phone Number <span className="text-slate-400 font-normal">(Optional for verification)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 0300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#093824]"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs sm:text-sm rounded-xl transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching Courier Networks...' : 'Track Package'}</span>
          </button>
        </form>

        {/* Result Container */}
        {order && (() => {
          const computedItemsSubtotal = Array.isArray(order.items)
            ? order.items.reduce((sum, it) => sum + extractItemTotal(it), 0)
            : 0;

          const displaySubtotal = (typeof order.subtotal === 'number' && order.subtotal > 0)
            ? order.subtotal
            : computedItemsSubtotal;

          const discount = Number(order.discount || 0);
          const shippingFee = (typeof order.shipping_fee === 'number' && order.shipping_fee >= 0)
            ? order.shipping_fee
            : (displaySubtotal >= 9999 ? 0 : 290);

          const displayTotal = (typeof order.total_amount === 'number' && order.total_amount > 0)
            ? order.total_amount
            : Math.max(0, displaySubtotal - discount + shippingFee);

          return (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Order Number</span>
                  <span className="font-mono font-bold text-[#093824] text-base">#{order.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Order Status</span>
                  <span className={`font-bold px-2.5 py-1 rounded-full text-xs inline-block ${
                    order.order_status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.order_status === 'Shipped' || order.order_status === 'Ready to Ship'
                      ? 'bg-blue-100 text-blue-800'
                      : order.order_status === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {order.order_status}
                  </span>
                </div>
              </div>

              {/* Transaction / Payment Verification Badge */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Method & Status</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : order.payment_method?.toUpperCase()}
                  </span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                    order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {order.payment_status.toUpperCase()}
                  </span>
                </div>
                {(order.transaction_id || order.transaction_ref) && (
                  <div className="sm:text-right">
                    <span className="text-slate-400 block text-[11px]">Transaction ID</span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {order.transaction_id || order.transaction_ref}
                    </span>
                  </div>
                )}
              </div>

              {order.tracking_number && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-700 font-semibold block text-[11px]">Courier Partner</span>
                    <span className="font-bold">{order.tracking_courier || 'TCS Express'}</span>
                  </div>
                  <div className="sm:text-right">
                    <span className="text-emerald-700 font-semibold block text-[11px]">Consignment #</span>
                    <span className="font-mono font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 inline-block">
                      {order.tracking_number}
                    </span>
                  </div>
                </div>
              )}

              {/* Timeline Progress */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-3">Fulfillment Timeline</p>
                <div className="space-y-3">
                  {ORDER_STEPS.slice(0, 5).map((step, idx) => {
                    const isDone = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={step} className="flex items-center gap-3 text-xs">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`font-medium ${isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-800 block mb-2">Ordered Items ({order.items.length}):</span>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar divide-y divide-slate-100">
                    {order.items.map((it) => {
                      const uPrice = extractItemUnitPrice(it);
                      const lineTot = extractItemTotal(it);
                      return (
                        <div key={it.id || Math.random()} className="flex items-center justify-between gap-3 text-xs py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={it.image_url || '/icon.svg'}
                              alt={it.product_name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{it.product_name}</p>
                              <p className="text-slate-500 text-[11px]">
                                Qty: <strong>{it.quantity || 1}</strong> · Price: Rs. {formatPrice(uPrice)} {it.variant_title && `· ${it.variant_title}`}
                              </p>
                            </div>
                          </div>
                          <span className="font-extrabold text-slate-900 tabular-nums shrink-0">
                            Rs. {formatPrice(lineTot)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Calculation Summary */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">Rs. {formatPrice(displaySubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Applied</span>
                    <span className="tabular-nums">- Rs. {formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-medium text-slate-800 tabular-nums">
                    {shippingFee === 0 ? 'FREE' : `Rs. ${formatPrice(shippingFee)}`}
                  </span>
                </div>
                <div className="flex justify-between font-extrabold text-[#093824] text-sm pt-2 border-t border-slate-200">
                  <span>Total Payable Amount</span>
                  <span className="tabular-nums text-base">Rs. {formatPrice(displayTotal)}</span>
                </div>
              </div>

              {/* Destination */}
              <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-200/80">
                <span className="text-slate-400 block mb-0.5 uppercase font-bold text-[10px]">Shipping Destination</span>
                <p className="font-bold text-slate-900">{order.customer_name} ({order.phone})</p>
                <p>{order.street_address}{order.area ? `, ${order.area}` : ''}, {order.city}{order.province ? `, ${order.province}` : ''}, Pakistan</p>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};
