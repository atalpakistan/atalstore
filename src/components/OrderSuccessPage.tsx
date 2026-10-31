import React, { useState, useEffect } from 'react';
import { CheckCircle, Truck, Package, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessPageProps {
  orderId: string;
  onNavigateHome: () => void;
  onNavigateTrack: () => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderId,
  onNavigateHome,
  onNavigateTrack,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-800 border-t-amber-400 rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-500">Retrieving your order confirmation...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-24 print:p-0 print:m-0">
      
      {/* Success Banner */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle className="w-10 h-10 stroke-[2.2]" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
          Order Confirmed
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Thank you for choosing ATAL!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
          Your order has been recorded in our permanent database and is being packed for express courier dispatch.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Top Header Information */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">Order Number</span>
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#093824]">
              {orderId}
            </span>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onNavigateTrack}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Track Delivery</span>
            </button>
          </div>
        </div>

        {/* Delivery & Payment Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Order Status</span>
            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded inline-block">
              {order?.order_status || 'Confirmed'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Payment Method</span>
            <span className="font-bold text-slate-800 uppercase">
              {order?.payment_method === 'cod' ? 'Cash on Delivery (COD)' : order?.payment_method?.toUpperCase()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Estimated Delivery</span>
            <span className="font-bold text-slate-800">
              2 to 4 Business Days (TCS / Leopard)
            </span>
          </div>
        </div>

        {/* Shipping Destination */}
        {order && (
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Delivery Destination</h3>
            <p className="font-semibold text-slate-900">{order.customer_name} ({order.phone})</p>
            <p className="text-slate-600">{order.street_address}, {order.area}</p>
            <p className="text-slate-600">{order.city}, {order.province}, Pakistan</p>
            {order.landmark && <p className="text-slate-400 italic">Landmark: {order.landmark}</p>}
          </div>
        )}

        {/* Itemized Products */}
        {order?.items && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Ordered Items</h3>
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url || '/icon.svg'}
                      alt={item.product_name}
                      className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-200"
                    />
                    <div>
                      <p className="font-semibold text-slate-800">{item.product_name}</p>
                      <p className="text-slate-500 text-[11px]">Qty: {item.quantity} {item.variant_title && `· ${item.variant_title}`}</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums">
                    Rs. {item.total.toLocaleString('en-PK')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Summary */}
        {order && (
          <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800 tabular-nums">Rs. {order.subtotal.toLocaleString('en-PK')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Applied</span>
                <span className="tabular-nums">- Rs. {order.discount.toLocaleString('en-PK')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-medium text-slate-800 tabular-nums">{order.shipping_fee === 0 ? 'FREE' : `Rs. ${order.shipping_fee}`}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#093824] pt-2 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="tabular-nums">Rs. {order.total_amount.toLocaleString('en-PK')}</span>
            </div>
          </div>
        )}

      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
        <button
          onClick={onNavigateHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition"
        >
          <span>Continue Shopping at ATAL</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
