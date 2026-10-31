import React, { useState } from 'react';
import { X, Search, Truck, CheckCircle2, Clock, AlertCircle, Package } from 'lucide-react';
import { Order } from '../types';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_STEPS = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered'];

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
        {order && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 block text-[11px]">Order Number</span>
                <span className="font-mono font-bold text-[#093824] text-base">{order.id}</span>
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
                <span className="text-xs font-semibold text-slate-700 block mb-2">Ordered Items ({order.items.length}):</span>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2 text-xs py-1">
                      <div className="flex items-center gap-2 truncate">
                        <img
                          src={it.image_url || '/icon.svg'}
                          alt={it.product_name}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <span className="text-slate-800 font-medium truncate">{it.product_name} &times; {it.quantity}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums shrink-0">
                        Rs. {it.total.toLocaleString('en-PK')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Destination */}
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              <span className="text-slate-400 block mb-0.5">Shipping Destination</span>
              <p className="font-semibold text-slate-800">{order.customer_name} ({order.phone})</p>
              <p>{order.street_address}, {order.city}, {order.province}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
