import React, { useState, useEffect } from 'react';
import {
  Package, Search, Truck, Clock, CheckCircle2, AlertCircle,
  User, Phone, Mail, MapPin, ArrowLeft, RefreshCw, Printer, ShieldCheck, ChevronRight, ShoppingBag
} from 'lucide-react';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../utils/api';

interface CustomerDashboardProps {
  initialOrderId?: string;
  onBackToStore: () => void;
  onNavigateProduct: (slug: string) => void;
}

const ORDER_STEPS = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered'];

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  initialOrderId = '',
  onBackToStore,
  onNavigateProduct,
}) => {
  const { user, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<'my_orders' | 'track_order' | 'profile'>('my_orders');
  const [searchInput, setSearchInput] = useState(initialOrderId);
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch logged-in user orders
  const fetchMyOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const token = localStorage.getItem('atal_auth_token');
      const { ok, data, error } = await safeFetchJson<Order[]>('/api/orders/my', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (ok && Array.isArray(data)) {
        setUserOrders(data);
        if (data.length > 0 && !selectedOrder) {
          setSelectedOrder(data[0]);
        }
      } else {
        setOrdersError(error || 'Could not fetch order history.');
      }
    } catch {
      setOrdersError('Failed to load orders.');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyOrders();
    }
  }, [user]);

  useEffect(() => {
    if (initialOrderId) {
      setSearchInput(initialOrderId);
      setActiveTab('track_order');
      handleSearchTrack(initialOrderId, '');
    }
  }, [initialOrderId]);

  // Handle single order track / lookup
  const handleSearchTrack = async (orderQuery: string, phoneQuery: string) => {
    const query = orderQuery.trim();
    if (!query) {
      setSearchError('Please enter a 9-digit Order Number or Phone Number.');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setSearchedOrder(null);

    try {
      const { ok, data, error } = await safeFetchJson<Order>('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: query, phone: phoneQuery.trim() }),
      });

      if (ok && data) {
        setSearchedOrder(data);
        setSelectedOrder(data);
      } else {
        setSearchError(error || `No order found with number "${query}". Please check your order confirmation or SMS.`);
      }
    } catch {
      setSearchError('Network error while looking up order. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const formatPrice = (amt?: number | null) => {
    if (typeof amt !== 'number' || isNaN(amt)) return '0';
    return amt.toLocaleString('en-PK');
  };

  const extractItemUnitPrice = (item: any): number => {
    const candidates = [item.unit_price, item.price, item.product_price];
    for (const c of candidates) {
      const num = Number(c);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };

  const extractItemTotal = (item: any): number => {
    const candidates = [item.total, item.line_total, item.total_price];
    for (const c of candidates) {
      const num = Number(c);
      if (!isNaN(num) && num > 0) return num;
    }
    const unit = extractItemUnitPrice(item);
    const qty = Number(item.quantity) || 1;
    return unit * qty;
  };

  const extractOrderSubtotal = (ord: Order): number => {
    const candidates = [ord.subtotal, (ord as any).sub_total];
    for (const c of candidates) {
      const num = Number(c);
      if (!isNaN(num) && num > 0) return num;
    }
    if (ord.items && ord.items.length > 0) {
      const sum = ord.items.reduce((acc, item) => acc + extractItemTotal(item), 0);
      if (sum > 0) return sum;
    }
    const totalNum = Number(ord.total_amount);
    const shipNum = Number(ord.shipping_fee) || 0;
    const discNum = Number(ord.discount) || 0;
    if (!isNaN(totalNum) && totalNum > 0) {
      return Math.max(0, totalNum - shipNum + discNum);
    }
    return 0;
  };

  const extractOrderTotal = (ord: Order): number => {
    const candidates = [ord.total_amount, (ord as any).total, (ord as any).grand_total];
    for (const c of candidates) {
      const num = Number(c);
      if (!isNaN(num) && num > 0) return num;
    }
    const sub = extractOrderSubtotal(ord);
    const ship = Number(ord.shipping_fee) || 0;
    const disc = Number(ord.discount) || 0;
    const calculated = sub + ship - disc;
    return Math.max(0, calculated);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStepStatus = (orderStatus: string, stepName: string) => {
    const idx = ORDER_STEPS.indexOf(orderStatus);
    const stepIdx = ORDER_STEPS.indexOf(stepName);
    if (idx === -1) return 'pending';
    if (stepIdx <= idx) return 'completed';
    return 'pending';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      
      {/* Top Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#093824] bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-sm mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-[#093824]" />
            <span>Customer Orders & Tracking Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your 9-digit Order Number, view live courier updates, and manage your account details.
          </p>
        </div>

        {/* User Badge / Quick Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-[#093824] text-amber-300 font-bold text-sm flex items-center justify-center">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 text-xs">{user.full_name}</p>
                <p className="text-[11px] text-slate-500">{user.email}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2.5 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl shadow hover:bg-[#062819] transition"
            >
              Sign In / Register Account
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('my_orders')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shrink-0 ${
            activeTab === 'my_orders'
              ? 'bg-[#093824] text-amber-300 shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>My Order History</span>
          {userOrders.length > 0 && (
            <span className="ml-1 bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
              {userOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('track_order')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shrink-0 ${
            activeTab === 'track_order'
              ? 'bg-[#093824] text-amber-300 shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Track 9-Digit Order ID</span>
        </button>

        {user && (
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shrink-0 ${
              activeTab === 'profile'
                ? 'bg-[#093824] text-amber-300 shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Customer Profile</span>
          </button>
        )}
      </div>

      {/* TAB 1: MY ORDER HISTORY */}
      {activeTab === 'my_orders' && (
        <div className="space-y-6">
          {!user ? (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-[#093824] rounded-2xl flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Sign in to view saved order history</h3>
              <p className="text-xs text-slate-500">
                Log in with your email or phone number to view all your past and active orders placed at ATAL STORE.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-3 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl shadow hover:bg-[#062819]"
                >
                  Sign In / Register
                </button>
                <button
                  onClick={() => setActiveTab('track_order')}
                  className="px-6 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                >
                  Track Single Order as Guest
                </button>
              </div>
            </div>
          ) : loadingOrders ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-[#093824] border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading your order history...</p>
            </div>
          ) : ordersError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between">
              <span>{ordersError}</span>
              <button
                onClick={fetchMyOrders}
                className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold"
              >
                Retry
              </button>
            </div>
          ) : userOrders.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm text-center max-w-md mx-auto space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-display text-lg font-bold text-slate-800">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-500">
                You haven't placed any orders with this account yet. Start exploring our latest collections!
              </p>
              <button
                onClick={onBackToStore}
                className="px-5 py-2.5 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl hover:bg-[#062819]"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Order List Sidebar */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Your Orders ({userOrders.length})
                  </h3>
                  <button
                    onClick={fetchMyOrders}
                    className="text-xs text-[#093824] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
                  {userOrders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-50/70 border-[#093824] shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-extrabold text-[#093824]">
                            Order #{ord.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            ord.order_status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.order_status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.order_status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                          <span>{formatDate(ord.created_at)}</span>
                          <span className="font-bold text-slate-900 tabular-nums text-sm">
                            Rs. {formatPrice(extractOrderTotal(ord))}
                          </span>
                        </div>

                        {ord.items && ord.items.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-2 truncate pt-2 border-t border-slate-100 flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">{ord.items.length} item(s):</span>
                            <span className="truncate">{ord.items.map(i => i.product_name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Detail View Panel */}
              <div className="lg:col-span-7">
                {selectedOrder ? (
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-medium">9-Digit Order ID</span>
                        <h2 className="font-mono text-2xl font-extrabold text-[#093824]">
                          {selectedOrder.id}
                        </h2>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          Placed on {formatDate(selectedOrder.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrintInvoice}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print Invoice</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Overview Card */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Fulfillment Status</span>
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded inline-block">
                            {selectedOrder.order_status}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">Payment Method</span>
                          <span className="font-bold text-slate-800 uppercase">
                            {selectedOrder.payment_method === 'cod' ? 'Cash on Delivery (COD)' : selectedOrder.payment_method?.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block mb-0.5">Transaction ID</span>
                          <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                            {selectedOrder.transaction_id || selectedOrder.transaction_ref || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {selectedOrder.tracking_number && (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-emerald-600" />
                            Courier: {selectedOrder.tracking_courier || 'TCS Express'}
                          </span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                            Tracking #: {selectedOrder.tracking_number}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Steps */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Live Courier Steps</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ORDER_STEPS.map((step) => {
                          const status = getStepStatus(selectedOrder.order_status, step);
                          return (
                            <div
                              key={step}
                              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                                status === 'completed'
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${status === 'completed' ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <span className="truncate">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Itemized Breakdown</h4>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden p-3 bg-white">
                        {selectedOrder.items?.map((item, idx) => (
                          <div key={item.id || item.product_id || idx} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image_url || '/icon.svg'}
                                alt={item.product_name}
                                className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                              />
                              <div>
                                <p className="font-bold text-slate-900">{item.product_name}</p>
                                <p className="text-slate-500 text-[11px]">
                                  Qty: {item.quantity} {item.variant_title && `· ${item.variant_title}`}
                                </p>
                                <p className="text-[#093824] font-semibold text-[11px] mt-0.5">
                                  Price: Rs. {formatPrice(extractItemUnitPrice(item))}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              Rs. {formatPrice(extractItemTotal(item))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Destination */}
                    <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-1">
                      <h4 className="font-bold text-slate-900 mb-1">Delivery Destination</h4>
                      <p className="font-semibold text-slate-800">{selectedOrder.customer_name} ({selectedOrder.phone})</p>
                      <p className="text-slate-600">{selectedOrder.street_address}, {selectedOrder.area}</p>
                      <p className="text-slate-600">{selectedOrder.city}, {selectedOrder.province}, Pakistan</p>
                      {selectedOrder.landmark && <p className="text-slate-400 italic">Landmark: {selectedOrder.landmark}</p>}
                    </div>

                    {/* Price Calculation Summary */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-semibold text-slate-900 tabular-nums">Rs. {formatPrice(extractOrderSubtotal(selectedOrder))}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Discount Applied</span>
                          <span className="tabular-nums">- Rs. {formatPrice(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Charges</span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          {selectedOrder.shipping_fee === 0 ? 'FREE' : `Rs. ${selectedOrder.shipping_fee}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold text-[#093824] pt-2 border-t border-slate-200">
                        <span>Total Payable Amount</span>
                        <span className="tabular-nums text-lg">Rs. {formatPrice(extractOrderTotal(selectedOrder))}</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Select an order from the left list to view full details.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRACK 9-DIGIT ORDER ID */}
      {activeTab === 'track_order' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-[#093824]" />
              <span>Lookup Order by 9-Digit Order ID or Phone</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchTrack(searchInput, phoneInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  9-Digit Order Number or Consignment # <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 901827463 or TCS Consignment #"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-3 bg-slate-50 border-2 border-emerald-900/30 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#093824] bg-white"
                  />
                  <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Every ATAL STORE order is assigned a unique 9-digit trackable order number.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Optional for identity verification)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300 1234567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#093824]"
                />
              </div>

              {searchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={searchLoading}
                className="w-full py-3.5 bg-[#093824] text-amber-300 font-bold text-sm rounded-xl shadow hover:bg-[#062819] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {searchLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Searching Order Database...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Find & Track Package</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Searched Order Result */}
          {searchedOrder && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block uppercase">Verified Order Found</span>
                  <span className="font-mono text-2xl font-extrabold text-[#093824]">
                    #{searchedOrder.id}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  searchedOrder.order_status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : searchedOrder.order_status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {searchedOrder.order_status}
                </span>
              </div>

              {/* Courier & Tracking Badges */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Payment Method</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {searchedOrder.payment_method === 'cod' ? 'Cash on Delivery (COD)' : searchedOrder.payment_method?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Payment Status</span>
                    <span className={`font-bold px-2 py-0.5 rounded inline-block ${
                      searchedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {searchedOrder.payment_status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Transaction Ref</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {searchedOrder.transaction_id || searchedOrder.transaction_ref || 'Verified'}
                    </span>
                  </div>
                </div>

                {searchedOrder.tracking_number && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-emerald-900">
                      Courier Partner: {searchedOrder.tracking_courier || 'TCS Express'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                      Consignment #: {searchedOrder.tracking_number}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Steps */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Courier Progress</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ORDER_STEPS.map((step) => {
                    const status = getStepStatus(searchedOrder.order_status, step);
                    return (
                      <div
                        key={step}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          status === 'completed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${status === 'completed' ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className="truncate">{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Itemized Products */}
              {searchedOrder.items && searchedOrder.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Ordered Items</h4>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden p-3 bg-white">
                    {searchedOrder.items.map((it, idx) => (
                      <div key={it.id || it.product_id || idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={it.image_url || '/icon.svg'}
                            alt={it.product_name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-800">{it.product_name}</p>
                            <p className="text-slate-500 text-[11px]">Qty: {it.quantity} {it.variant_title && `· ${it.variant_title}`}</p>
                            <p className="text-[#093824] font-semibold text-[11px] mt-0.5">
                              Price: Rs. {formatPrice(extractItemUnitPrice(it))}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums">
                          Rs. {formatPrice(extractItemTotal(it))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Destination */}
              <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-1">
                <h4 className="font-bold text-slate-800 mb-0.5">Shipping Destination</h4>
                <p className="font-semibold text-slate-900">{searchedOrder.customer_name} ({searchedOrder.phone})</p>
                <p className="text-slate-600">{searchedOrder.street_address}, {searchedOrder.city}, {searchedOrder.province}</p>
              </div>

              {/* Financial Summary */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 tabular-nums">Rs. {formatPrice(extractOrderSubtotal(searchedOrder))}</span>
                </div>
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Applied</span>
                    <span className="tabular-nums">- Rs. {formatPrice(searchedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {searchedOrder.shipping_fee === 0 ? 'FREE' : `Rs. ${searchedOrder.shipping_fee}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#093824] pt-2 border-t border-slate-200">
                  <span>Total Payable Amount</span>
                  <span className="tabular-nums text-lg">Rs. {formatPrice(extractOrderTotal(searchedOrder))}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER PROFILE */}
      {activeTab === 'profile' && user && (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-display text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-[#093824]" />
            <span>Customer Profile Details</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{user.full_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Email Address</span>
                  <span className="font-bold text-slate-900 text-sm">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[11px]">Registered Mobile Number</span>
                  <span className="font-bold text-slate-900 text-sm">{user.phone || 'Not provided'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold">Verified ATAL Customer Account</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Your order records and tracking information are permanently encrypted and saved under your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
