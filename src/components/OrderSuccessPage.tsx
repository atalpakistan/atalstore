import React, { useState, useEffect } from 'react';
import { CheckCircle, Truck, Printer, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessPageProps {
  orderId: string;
  onNavigateHome: () => void;
  onNavigateTrack: () => void;
}

const formatPrice = (amt?: number | null): string => {
  if (typeof amt !== 'number' || isNaN(amt)) return '0';
  return amt.toLocaleString('en-PK');
};

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderId,
  onNavigateHome,
  onNavigateTrack,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Load cached order instantly from sessionStorage if available
  useEffect(() => {
    if (!orderId) return;
    try {
      const cachedStr = sessionStorage.getItem(`atal_order_${orderId}`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && (cached.id || cached.orderId)) {
          setOrder(cached);
          if (Array.isArray(cached.items) && cached.items.length > 0) {
            setLoading(false);
          }
        }
      }
    } catch {
      // Ignored
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setFetchError('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data = await res.json();
        console.log('🧾 [Order Confirmation Pricing Audit] Retrieved order from API:', {
          orderId: data.id,
          subtotal: data.subtotal,
          total_amount: data.total_amount,
          items: data.items?.map((i: any) => ({
            name: i.product_name,
            price: i.price,
            quantity: i.quantity,
            total: i.total
          }))
        });
        setOrder(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData.error || 'Order record created, but details could not be loaded immediately.');
      }
    } catch {
      setFetchError('Network communication error while loading order status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const safeOrderId = orderId || order?.id || 'N/A';

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 px-4">
        <div className="w-10 h-10 border-4 border-[#093824] border-t-amber-400 rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Retrieving order confirmation details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pb-24 print:p-0 print:m-0">
      
      {/* Success Banner */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 text-[#093824] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle className="w-10 h-10 stroke-[2.2]" />
        </div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-[#093824]">
          Order Confirmed & Saved
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          Thank you for choosing ATAL STORE!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
          Your order has been saved in our permanent database and is being processed for courier dispatch.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Top Header Information */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-400 block uppercase font-medium">9-Digit Order Number</span>
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#093824]">
              #{safeOrderId}
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
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#093824] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
            >
              <Truck className="w-4 h-4 text-[#093824]" />
              <span>Customer Dashboard</span>
            </button>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{fetchError} You can track your order using your 9-digit Order ID: <strong>#{safeOrderId}</strong></span>
            </div>
            <button
              onClick={loadOrder}
              className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg shrink-0 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Delivery & Payment Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Order Status</span>
            <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded inline-block">
              {order?.order_status || 'Confirmed'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Payment Method</span>
            <span className="font-bold text-slate-800 uppercase">
              {order?.payment_method === 'cod'
                ? 'Cash on Delivery (COD)'
                : (order?.payment_method ? String(order.payment_method).toUpperCase() : 'VERIFIED')}
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
            <p className="font-semibold text-slate-900">{order.customer_name || 'Customer'} ({order.phone || 'Phone verified'})</p>
            <p className="text-slate-600">{order.street_address || ''} {order.area ? `, ${order.area}` : ''}</p>
            <p className="text-slate-600">{order.city || ''}{order.province ? `, ${order.province}` : ''}, Pakistan</p>
            {order.landmark && <p className="text-slate-400 italic">Landmark: {order.landmark}</p>}
          </div>
        )}

        {/* Itemized Products */}
        {Array.isArray(order?.items) && order.items.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Ordered Items ({order.items.length})</h3>
            <div className="divide-y divide-slate-100">
              {order.items.map((item, idx) => {
                const itemKey = item.id || (item.product_id ? `${item.product_id}-${item.variant_id || idx}` : `item-${idx}`);
                const unitPrice = item.price ?? (item.total && item.quantity ? item.total / item.quantity : 0);
                const itemTotal = item.total ?? (unitPrice * (item.quantity || 1));

                return (
                  <div key={itemKey} className="py-3 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image_url || '/icon.svg'}
                        alt={item.product_name || 'Product'}
                        className="w-12 h-12 object-cover rounded-xl bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{item.product_name || 'Product'}</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-slate-500 text-[11px] mt-0.5">
                          <span>Qty: <strong>{item.quantity || 1}</strong></span>
                          <span>·</span>
                          <span>Price: Rs. {formatPrice(unitPrice)}</span>
                          {item.variant_title && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-800 font-medium">{item.variant_title}</span>
                            </>
                          )}
                          {item.sku && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-slate-400">SKU: {item.sku}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 tabular-nums block text-sm">
                        Rs. {formatPrice(itemTotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Price Summary */}
        {order && (
          <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800 tabular-nums">Rs. {formatPrice(order.subtotal)}</span>
            </div>
            {typeof order.discount === 'number' && order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Applied</span>
                <span className="tabular-nums">- Rs. {formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-medium text-slate-800 tabular-nums">
                {order.shipping_fee === 0 ? 'FREE' : `Rs. ${formatPrice(order.shipping_fee)}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-[#093824] pt-2 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="tabular-nums text-lg">Rs. {formatPrice(order.total_amount)}</span>
            </div>
          </div>
        )}

      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
        <button
          onClick={onNavigateTrack}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition"
        >
          <Truck className="w-4 h-4" />
          <span>View in Customer Dashboard</span>
        </button>
        <button
          onClick={onNavigateHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
