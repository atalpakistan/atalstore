import React, { useState, useEffect } from 'react';
import { safeFetchJson } from '../utils/api';
import {
  LayoutDashboard, Package, Grid, ShoppingCart, Image, Sparkles,
  Settings, Download, Upload, Clock, Ticket, Shield, RefreshCw,
  Plus, Edit2, Trash2, Copy, Search, Check, AlertCircle, X,
  TrendingUp, Truck, CheckCircle2, AlertTriangle, ArrowLeft, ExternalLink,
  KeyRound, Users, Lock, RotateCcw, CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Product, Category, Order, Banner, HomepageSection,
  StoreSettings, LaunchSoonProduct, Coupon
} from '../types';

interface AdminDashboardProps {
  onBackToStore: () => void;
  onNavigateProduct: (slug: string) => void;
}

type TabType =
  | 'overview'
  | 'products'
  | 'categories'
  | 'orders'
  | 'banners'
  | 'homepage'
  | 'launch_soon'
  | 'coupons'
  | 'settings'
  | 'staff'
  | 'backup';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToStore,
  onNavigateProduct,
}) => {
  const { token, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Overview metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusDraft, setOrderStatusDraft] = useState<string>('Pending');
  const [paymentStatusDraft, setPaymentStatusDraft] = useState<string>('pending');
  const [courierDraft, setCourierDraft] = useState<string>('TCS Express');
  const [trackingDraft, setTrackingDraft] = useState<string>('');
  const [transactionIdDraft, setTransactionIdDraft] = useState<string>('');
  const [savingOrder, setSavingOrder] = useState<boolean>(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Banners state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // Homepage sections state
  const [sections, setSections] = useState<HomepageSection[]>([]);

  // Launch soon state
  const [launchSoon, setLaunchSoon] = useState<LaunchSoonProduct[]>([]);
  const [editingLaunchSoon, setEditingLaunchSoon] = useState<Partial<LaunchSoonProduct> | null>(null);
  const [isLaunchSoonModalOpen, setIsLaunchSoonModalOpen] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponVal, setNewCouponVal] = useState<number>(10);
  const [newCouponMin, setNewCouponMin] = useState<number>(2000);

  // Settings & Saving state
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [savingLaunchSoon, setSavingLaunchSoon] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [savingSections, setSavingSections] = useState(false);

  // Staff & Passwords state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffUser, setSelectedStaffUser] = useState<string>('');
  const [newStaffPassword, setNewStaffPassword] = useState<string>('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);
  const [resettingDefaults, setResettingDefaults] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);

  // Backup & Restore
  const [backupJson, setBackupJson] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
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

  const extractOrderSubtotal = (order: Order): number => {
    if (typeof order.subtotal === 'number' && order.subtotal > 0) {
      return order.subtotal;
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
      const itemsSum = order.items.reduce((sum, it) => sum + extractItemTotal(it), 0);
      if (itemsSum > 0) return itemsSum;
    }
    return Number(order.subtotal) || 0;
  };

  const extractOrderTotal = (order: Order): number => {
    if (typeof order.total_amount === 'number' && order.total_amount > 0) {
      return order.total_amount;
    }
    const sub = extractOrderSubtotal(order);
    const discount = Number(order.discount || 0);
    const shipping = Number(order.shipping_fee !== undefined && order.shipping_fee !== null ? order.shipping_fee : (sub >= 9999 ? 0 : 290));
    const grand = Math.max(0, sub - discount + shipping);
    return grand > 0 ? grand : Number(order.total_amount) || 0;
  };

  // 1. Fetch Metrics
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    const { ok, data } = await safeFetchJson('/api/admin/metrics', { headers: authHeaders });
    if (ok && data) setMetrics(data);
    setLoadingMetrics(false);
  };

  // 2. Fetch Products
  const fetchProducts = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/products', { headers: authHeaders });
    if (ok && Array.isArray(data)) setProducts(data);
  };

  // 3. Fetch Categories
  const fetchCategories = async () => {
    const { ok, data } = await safeFetchJson('/api/categories');
    if (ok && Array.isArray(data)) setCategories(data);
  };

  // 4. Fetch Orders
  const fetchOrders = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/orders', { headers: authHeaders });
    if (ok && Array.isArray(data)) setOrders(data);
  };

  // 5. Fetch Banners
  const fetchBanners = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/banners', { headers: authHeaders });
    if (ok && Array.isArray(data)) setBanners(data);
  };

  // 6. Fetch Homepage Sections
  const fetchSections = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/homepage', { headers: authHeaders });
    if (ok && Array.isArray(data)) setSections(data);
  };

  // 7. Fetch Launch Soon
  const fetchLaunchSoon = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/launch-soon', { headers: authHeaders });
    if (ok && Array.isArray(data)) setLaunchSoon(data);
  };

  // 8. Fetch Coupons
  const fetchCoupons = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/coupons', { headers: authHeaders });
    if (ok && Array.isArray(data)) setCoupons(data);
  };

  // 9. Fetch Settings
  const fetchSettings = async () => {
    const { ok, data } = await safeFetchJson('/api/admin/settings', { headers: authHeaders });
    if (ok && data) setSettings(data);
  };

  // 10. Fetch Staff Accounts
  const fetchStaff = async () => {
    const { ok, data } = await safeFetchJson<any[]>('/api/admin/staff', { headers: authHeaders });
    if (ok && Array.isArray(data)) {
      setStaffList(data);
      if (data.length > 0 && !selectedStaffUser) {
        setSelectedStaffUser(data[0].id);
      }
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchProducts();
    fetchCategories();
    fetchOrders();
    fetchBanners();
    fetchSections();
    fetchLaunchSoon();
    fetchCoupons();
    fetchSettings();
    fetchStaff();
  }, [activeTab]);

  // Image Upload Helper
  const handleImageUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, onUploaded: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const { ok, data, error } = await safeFetchJson('/api/admin/upload', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ filename: file.name, base64Data })
      });
      if (ok && data?.url) {
        onUploaded(data.url);
        showFeedback('Image uploaded successfully');
      } else {
        showFeedback(error || 'Upload failed', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editingCategory.name || !editingCategory.name.trim()) {
      showFeedback('Category name is required', 'error');
      return;
    }

    setSavingCategory(true);
    const isNew = !editingCategory.id;
    const url = isNew ? '/api/admin/categories' : `/api/admin/categories/${editingCategory.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const { ok, error } = await safeFetchJson(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(editingCategory)
    });
    setSavingCategory(false);

    if (!ok) {
      showFeedback(error || 'Failed to save category', 'error');
    } else {
      showFeedback(isNew ? 'Category created permanently' : 'Category updated permanently');
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    const { ok, error } = await safeFetchJson(`/api/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders });
    if (!ok) {
      showFeedback(error || 'Failed to delete category', 'error');
    } else {
      showFeedback('Category deleted');
      fetchCategories();
    }
  };

  // Banner Actions
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    if (!editingBanner.title || !editingBanner.title.trim()) {
      showFeedback('Banner title is required', 'error');
      return;
    }

    setSavingBanner(true);
    const isNew = !editingBanner.id;
    const url = isNew ? '/api/admin/banners' : `/api/admin/banners/${editingBanner.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const { ok, error } = await safeFetchJson(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(editingBanner)
    });
    setSavingBanner(false);

    if (!ok) {
      showFeedback(error || 'Failed to save banner', 'error');
    } else {
      showFeedback(isNew ? 'Banner created permanently' : 'Banner updated permanently');
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      fetchBanners();
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    const { ok, error } = await safeFetchJson(`/api/admin/banners/${id}`, { method: 'DELETE', headers: authHeaders });
    if (ok) {
      showFeedback('Banner deleted');
      fetchBanners();
    } else {
      showFeedback(error || 'Failed to delete banner', 'error');
    }
  };

  // Launch Soon Actions
  const handleSaveLaunchSoon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLaunchSoon) return;
    if (!editingLaunchSoon.product_name || !editingLaunchSoon.product_name.trim()) {
      showFeedback('Product name is required for upcoming drop', 'error');
      return;
    }

    setSavingLaunchSoon(true);
    const isNew = !editingLaunchSoon.id;
    const url = isNew ? '/api/admin/launch-soon' : `/api/admin/launch-soon/${editingLaunchSoon.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const { ok, error } = await safeFetchJson(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(editingLaunchSoon)
    });
    setSavingLaunchSoon(false);

    if (!ok) {
      showFeedback(error || 'Failed to save launch soon item', 'error');
    } else {
      showFeedback(isNew ? 'Upcoming drop created permanently' : 'Upcoming drop updated permanently');
      setIsLaunchSoonModalOpen(false);
      setEditingLaunchSoon(null);
      fetchLaunchSoon();
    }
  };

  const handleDeleteLaunchSoon = async (id: string) => {
    if (!confirm('Delete this upcoming drop?')) return;
    const { ok, error } = await safeFetchJson(`/api/admin/launch-soon/${id}`, { method: 'DELETE', headers: authHeaders });
    if (ok) {
      showFeedback('Launch Soon item deleted');
      fetchLaunchSoon();
    } else {
      showFeedback(error || 'Failed to delete launch soon item', 'error');
    }
  };

  // Staff Password Management
  const handleChangeStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser) {
      showFeedback('Please select a staff account to change password', 'error');
      return;
    }
    if (!newStaffPassword || newStaffPassword.length < 4) {
      showFeedback('Password must be at least 4 characters long', 'error');
      return;
    }
    if (newStaffPassword !== confirmStaffPassword) {
      showFeedback('Passwords do not match. Please re-enter identical passwords.', 'error');
      return;
    }

    setChangingPassword(true);
    const { ok, data, error } = await safeFetchJson('/api/admin/staff/update-password', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        user_id: selectedStaffUser,
        new_password: newStaffPassword,
      }),
    });
    setChangingPassword(false);

    if (!ok) {
      showFeedback(error || 'Failed to update staff password', 'error');
    } else {
      showFeedback(data?.message || 'Staff password successfully updated!');
      setNewStaffPassword('');
      setConfirmStaffPassword('');
      fetchStaff();
    }
  };

  const handleResetToDefaults = async () => {
    setResettingDefaults(true);
    const { ok, data, error } = await safeFetchJson('/api/admin/staff/reset-defaults', {
      method: 'POST',
      headers: authHeaders,
    });
    setResettingDefaults(false);

    if (!ok) {
      showFeedback(error || 'Failed to reset default credentials', 'error');
    } else {
      showFeedback(data?.message || 'Default passwords restored successfully!');
      setShowResetConfirmModal(false);
      fetchStaff();
    }
  };

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.name.trim()) {
      showFeedback('Product name is required', 'error');
      return;
    }
    if (editingProduct.sale_price === undefined || editingProduct.sale_price === null || Number(editingProduct.sale_price) < 0) {
      showFeedback('Valid sale price is required', 'error');
      return;
    }
    if (!editingProduct.category_id) {
      showFeedback('Please select a product category', 'error');
      return;
    }

    setSavingProduct(true);
    const isNew = !editingProduct.id;
    const url = isNew ? '/api/admin/products' : `/api/admin/products/${editingProduct.id}`;
    const method = isNew ? 'POST' : 'PUT';

    const { ok, error } = await safeFetchJson(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(editingProduct),
    });
    setSavingProduct(false);

    if (!ok) {
      showFeedback(error || 'Failed to save product to database', 'error');
      return;
    }

    showFeedback(isNew ? 'Product created successfully' : 'Product updated permanently');
    setIsProductModalOpen(false);
    setEditingProduct(null);
    fetchProducts();
    fetchMetrics();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    const { ok, error } = await safeFetchJson(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (ok) {
      showFeedback('Product deleted from database');
      fetchProducts();
      fetchMetrics();
    } else {
      showFeedback(error || 'Failed to delete product', 'error');
    }
  };

  const handleDuplicateProduct = async (id: string) => {
    const { ok, error } = await safeFetchJson(`/api/admin/products/${id}/duplicate`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (ok) {
      showFeedback('Product duplicated successfully');
      fetchProducts();
      fetchMetrics();
    } else {
      showFeedback(error || 'Failed to duplicate product', 'error');
    }
  };

  // Order Management Functions
  const handleOpenOrderManage = (o: Order) => {
    setSelectedOrder(o);
    setOrderStatusDraft(o.order_status || 'Pending');
    setPaymentStatusDraft(o.payment_status || 'pending');
    setCourierDraft(o.tracking_courier || 'TCS Express');
    setTrackingDraft(o.tracking_number || '');
    setTransactionIdDraft(o.transaction_id || o.transaction_ref || '');
  };

  const handleCopyTransactionId = (txId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!txId) return;
    navigator.clipboard.writeText(txId);
    setCopiedTxId(txId);
    showFeedback(`Transaction ID copied: ${txId}`);
    setTimeout(() => setCopiedTxId(null), 2500);
  };

  const handleSaveOrderChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOrder) return;

    setSavingOrder(true);
    const { ok, data, error } = await safeFetchJson<{ success: boolean; order?: Order }>(`/api/admin/orders/${selectedOrder.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        order_status: orderStatusDraft,
        payment_status: paymentStatusDraft,
        tracking_number: trackingDraft.trim() || null,
        tracking_courier: courierDraft.trim() || null,
        transaction_id: transactionIdDraft.trim() || null,
      })
    });
    setSavingOrder(false);

    if (ok) {
      showFeedback(`Order ${selectedOrder.id} successfully updated to ${orderStatusDraft}`);
      const updated = data?.order || {
        ...selectedOrder,
        order_status: orderStatusDraft as any,
        payment_status: paymentStatusDraft as any,
        tracking_number: trackingDraft.trim() || undefined,
        tracking_courier: courierDraft.trim() || undefined,
        transaction_id: transactionIdDraft.trim() || undefined,
        transaction_ref: transactionIdDraft.trim() || undefined,
      };
      setSelectedOrder(updated);
      setOrders((prev) => prev.map((ord) => (ord.id === selectedOrder.id ? updated : ord)));
      fetchOrders();
      fetchMetrics();
    } else {
      showFeedback(error || 'Failed to update order status', 'error');
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const { ok, error } = await safeFetchJson(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        order_status: newStatus,
        payment_status: target.payment_status,
        tracking_number: target.tracking_number,
        tracking_courier: target.tracking_courier,
        transaction_id: target.transaction_id || target.transaction_ref,
      })
    });
    if (ok) {
      showFeedback(`Order ${orderId} marked as ${newStatus}`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus as any } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, order_status: newStatus as any });
        setOrderStatusDraft(newStatus);
      }
      fetchOrders();
      fetchMetrics();
    } else {
      showFeedback(error || 'Failed to update status', 'error');
    }
  };

  const handleQuickMarkPaid = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const { ok, error } = await safeFetchJson(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        order_status: target.order_status === 'Pending' ? 'Confirmed' : target.order_status,
        payment_status: 'paid',
        tracking_number: target.tracking_number,
        tracking_courier: target.tracking_courier,
        transaction_id: target.transaction_id || target.transaction_ref,
      })
    });
    if (ok) {
      showFeedback(`Order ${orderId} payment marked as PAID`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_status: 'paid', order_status: o.order_status === 'Pending' ? 'Confirmed' : o.order_status } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: 'paid', order_status: selectedOrder.order_status === 'Pending' ? 'Confirmed' : selectedOrder.order_status });
        setPaymentStatusDraft('paid');
        if (orderStatusDraft === 'Pending') setOrderStatusDraft('Confirmed');
      }
      fetchOrders();
      fetchMetrics();
    } else {
      showFeedback(error || 'Failed to update payment status', 'error');
    }
  };

  // Save Homepage Sections
  const handleSaveSections = async () => {
    setSavingSections(true);
    const { ok, error } = await safeFetchJson('/api/admin/homepage', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ sections })
    });
    setSavingSections(false);

    if (ok) {
      showFeedback('Homepage section settings saved permanently');
      fetchSections();
    } else {
      showFeedback(error || 'Failed to update homepage settings', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const { ok, error } = await safeFetchJson('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(settings)
    });
    setSavingSettings(false);
    if (ok) {
      showFeedback('Global settings updated and persisted');
      fetchSettings();
    } else {
      showFeedback(error || 'Failed to save settings', 'error');
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) {
      showFeedback('Coupon code is required', 'error');
      return;
    }

    setSavingCoupon(true);
    const { ok, error } = await safeFetchJson('/api/admin/coupons', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        code: newCouponCode.trim(),
        discount_type: newCouponType,
        discount_value: Number(newCouponVal),
        min_order_amount: Number(newCouponMin)
      })
    });
    setSavingCoupon(false);

    if (ok) {
      showFeedback(`Coupon ${newCouponCode.toUpperCase()} created permanently`);
      setNewCouponCode('');
      fetchCoupons();
    } else {
      showFeedback(error || 'Failed to create coupon', 'error');
    }
  };

  // Backup Export & Import
  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup/export', { headers: authHeaders });
      if (!res.ok) {
        const text = await res.text();
        showFeedback(`Export failed: ${text}`, 'error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atal-store-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showFeedback('Backup exported successfully');
    } catch (err: any) {
      showFeedback(`Export failed: ${err.message}`, 'error');
    }
  };

  const handleImportBackup = async (dryRun = false) => {
    try {
      const parsed = JSON.parse(backupJson);
      const { ok, data, error } = await safeFetchJson('/api/admin/backup/import', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ backupData: parsed, dryRun })
      });
      if (!ok) {
        setImportStatus(`Import Error: ${error}`);
      } else {
        setImportStatus(data?.message || 'Restore completed');
        if (!dryRun) {
          showFeedback('Database successfully restored from backup!');
          fetchMetrics();
          fetchProducts();
          fetchCategories();
        }
      }
    } catch (err: any) {
      setImportStatus(`Invalid JSON File: ${err.message}`);
    }
  };

  // Persistence Diagnostic Test
  const runPersistenceDiagnostic = async () => {
    showFeedback('Starting persistence diagnostic test...', 'success');
    try {
      // 1. Get current settings
      const { ok: ok1, data: originalSettings } = await safeFetchJson('/api/admin/settings', { headers: authHeaders });
      if (!ok1 || !originalSettings) throw new Error('Failed to fetch initial settings');
      
      const testKey = 'store_name';
      const originalValue = originalSettings[testKey];
      const testValue = `TEST_VAL_${Date.now()}`;

      // 2. PUT test settings
      const { ok: ok2, error: error2 } = await safeFetchJson('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...originalSettings, [testKey]: testValue })
      });
      if (!ok2) throw new Error(`PUT request failed: ${error2}`);

      // 3. GET settings immediately
      const { ok: ok3, data: verifySettings } = await safeFetchJson('/api/admin/settings', { headers: authHeaders });
      if (!ok3 || !verifySettings) throw new Error('Failed to fetch settings for verification');

      // 4. Verify
      if (verifySettings[testKey] === testValue) {
        showFeedback('Success: Data persistence verified!', 'success');
        // Restore original
        await safeFetchJson('/api/admin/settings', {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ ...originalSettings, [testKey]: originalValue })
        });
        fetchSettings();
      } else {
        throw new Error('Data mismatch: Update did not persist in database.');
      }
    } catch (err: any) {
      showFeedback(`Diagnostic Failed: ${err.message}`, 'error');
    }
  };

  const formatPrice = (val?: number | string | null): string => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-PK');
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString('en-PK');
    } catch {
      return String(dateStr);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const q = productSearch.toLowerCase().trim();
    if (!q) return true;
    const nameStr = String(p.name || '').toLowerCase();
    const brandStr = String(p.brand || '').toLowerCase();
    const skuStr = String(p.sku || '').toLowerCase();
    const catStr = String(p.category_name || '').toLowerCase();
    return nameStr.includes(q) || brandStr.includes(q) || skuStr.includes(q) || catStr.includes(q);
  });

  const filteredOrders = orders.filter((o) => {
    if (!o) return false;
    const q = orderSearch.toLowerCase().trim();
    if (!q) return true;
    const idStr = String(o.id || '').toLowerCase();
    const txIdStr = String(o.transaction_id || o.transaction_ref || '').toLowerCase();
    const custStr = String(o.customer_name || '').toLowerCase();
    const phoneStr = String(o.phone || '').toLowerCase();
    const trackStr = String(o.tracking_number || '').toLowerCase();
    const statusStr = String(o.order_status || '').toLowerCase();
    const methodStr = String(o.payment_method || '').toLowerCase();
    const cityStr = String(o.city || '').toLowerCase();
    return (
      idStr.includes(q) ||
      txIdStr.includes(q) ||
      custStr.includes(q) ||
      phoneStr.includes(q) ||
      trackStr.includes(q) ||
      statusStr.includes(q) ||
      methodStr.includes(q) ||
      cityStr.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* Top Admin Navbar */}
      <header className="bg-[#062819] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md border-b border-emerald-950 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight">
              ATAL <span className="text-amber-300 font-normal text-xs uppercase px-2 py-0.5 bg-emerald-950 rounded border border-emerald-800">Admin Control</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 font-semibold rounded-lg border border-amber-400/30 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </button>
          <span className="text-emerald-400 hidden sm:inline">|</span>
          <span className="text-slate-300 hidden sm:inline">{user?.email}</span>
          <button
            onClick={logout}
            className="text-red-400 hover:text-red-300 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Global Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`fixed top-16 right-4 z-50 p-4 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border animate-in slide-in-from-top-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-900 text-amber-200 border-amber-400/40'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-amber-300" /> : <AlertTriangle className="w-4 h-4 text-rose-300" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Admin Body with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-[#093824] text-emerald-100/90 p-4 border-r border-[#0f4d33] flex-shrink-0">
          <nav className="space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'overview' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeTab === 'products' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Products & Inventory</span>
              </span>
              <span className="text-[10px] font-mono opacity-80">{products.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeTab === 'categories' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Grid className="w-4 h-4" />
                <span>Categories (5 Main)</span>
              </span>
              <span className="text-[10px] font-mono opacity-80">{categories.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeTab === 'orders' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4" />
                <span>Orders & Fulfillment</span>
              </span>
              <span className="text-[10px] font-mono opacity-80">{orders.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('homepage')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'homepage' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Homepage 7 Sections</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'banners' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Image className="w-4 h-4" />
              <span>Promotional Banners</span>
            </button>

            <button
              onClick={() => setActiveTab('launch_soon')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'launch_soon' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Launch Soon Drops</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'coupons' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Coupons & Discounts</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'settings' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Gateways & Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition ${
                activeTab === 'staff' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4" />
                <span>Staff & Passwords</span>
              </span>
              <span className="text-[10px] bg-emerald-950 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                {staffList.length || 2}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition ${
                activeTab === 'backup' ? 'bg-amber-400 text-[#093824] font-bold shadow-sm' : 'hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Backup & Restore (JSON)</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
          
          {/* TAB 1: OVERVIEW METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Storefront Executive Overview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live database statistics for Pakistan orders and inventory
                  </p>
                </div>
                <button
                  onClick={fetchMetrics}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
                  title="Refresh Metrics"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Total Orders</span>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">
                    {metrics?.totalOrders || 0}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {metrics?.todayOrders || 0} placed today
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Total Sales (PKR)</span>
                  <div className="text-2xl font-bold text-[#093824] tabular-nums">
                    Rs. {(metrics?.totalSales || 0).toLocaleString('en-PK')}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Rs. {(metrics?.todaySales || 0).toLocaleString('en-PK')} today
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Pending Orders</span>
                  <div className="text-2xl font-bold text-amber-600 tabular-nums">
                    {metrics?.pendingOrders || 0}
                  </div>
                  <span className="text-[11px] text-slate-400">Awaiting confirmation</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">Low Stock Alerts</span>
                  <div className="text-2xl font-bold text-rose-600 tabular-nums">
                    {metrics?.lowStockProducts?.length || 0}
                  </div>
                  <span className="text-[11px] text-rose-600 font-medium">Requires replenishment</span>
                </div>
              </div>

              {/* Low Stock Warning Box */}
              {metrics?.lowStockProducts && metrics.lowStockProducts.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                  <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Low Stock Products Requiring Restock
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {metrics.lowStockProducts.map((p: any) => (
                      <div key={p.id} className="bg-white p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
                        <span className="font-medium text-slate-800 truncate mr-2">{p.name} ({p.sku})</span>
                        <span className="font-bold text-rose-600 tabular-nums shrink-0">{p.available_stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Orders Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-900">Recent Customer Orders</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    View All Orders &rarr;
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {metrics?.recentOrders?.map((o: any) => (
                        <tr key={o.id || Math.random()} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#093824]">{o.id || 'N/A'}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{o.customer_name || 'Customer'}</td>
                          <td className="py-3 px-4">{o.city || 'Pakistan'}</td>
                          <td className="py-3 px-4 uppercase">{o.payment_method || 'COD'}</td>
                          <td className="py-3 px-4 font-bold tabular-nums">Rs. {formatPrice(o.total_amount)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-100 text-emerald-800">
                              {o.order_status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Product Management
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add, edit, duplicate, and assign products to homepage sections
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct({
                      name: '',
                      slug: '',
                      sku: `ATAL-${Date.now().toString().slice(-5)}`,
                      brand: 'ATAL',
                      category_id: categories[0]?.id || 'cat_men',
                      short_description: '',
                      description: '',
                      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
                      sale_price: 2999,
                      original_price: 3999,
                      purchase_price: 1800,
                      available_stock: 25,
                      low_stock_threshold: 5,
                      rating: 5.0,
                      reviews_count: 0,
                      new_launch: 1,
                      spotlight: 0,
                      festive_deal: 0,
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter products by name, SKU, or brand..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#093824]"
                />
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Price (PKR)</th>
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Homepage Sections</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images?.[0] || '/icon.svg'}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                              />
                              <div>
                                <p className="font-semibold text-slate-900 line-clamp-1">{p.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">SKU: {p.sku} | /{p.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{p.category_name}</td>
                          <td className="py-3 px-4 font-bold text-[#093824] tabular-nums">
                            Rs. {formatPrice(p.sale_price)}
                          </td>
                          <td className="py-3 px-4 tabular-nums">
                            <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              p.available_stock <= p.low_stock_threshold
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {p.available_stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 text-[10px]">
                              {p.festive_deal === 1 && (
                                <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">Festive</span>
                              )}
                              {p.spotlight === 1 && (
                                <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">Spotlight</span>
                              )}
                              {p.new_launch === 1 && (
                                <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">New</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => onNavigateProduct(p.slug)}
                                className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded-lg"
                                title="View storefront detail"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p.id)}
                                className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 rounded-lg"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Product Edit / Add Modal */}
              {isProductModalOpen && editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        {editingProduct.id ? 'Edit Product Record' : 'Create New Product'}
                      </h3>
                      <button
                        onClick={() => setIsProductModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.name || ''}
                            onChange={(e) => {
                              const name = e.target.value;
                              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                              setEditingProduct({ ...editingProduct, name, slug: !editingProduct.id ? slug : editingProduct.slug });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#093824]"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Unique URL Slug *</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.slug || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">SKU *</label>
                          <input
                            type="text"
                            required
                            value={editingProduct.sku || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Brand *</label>
                          <input
                            type="text"
                            value={editingProduct.brand || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                          <select
                            value={editingProduct.category_id || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value, subcategory_id: '' })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
                          <select
                            value={editingProduct.subcategory_id || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, subcategory_id: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          >
                            <option value="">-- None / General --</option>
                            {categories.find(c => c.id === editingProduct.category_id)?.subcategories?.map((sub: any) => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Sale Price (PKR) *</label>
                          <input
                            type="number"
                            required
                            value={editingProduct.sale_price || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, sale_price: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Original Price (PKR)</label>
                          <input
                            type="number"
                            value={editingProduct.original_price || ''}
                            onChange={(e) => setEditingProduct({ ...editingProduct, original_price: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Available Stock *</label>
                          <input
                            type="number"
                            required
                            value={editingProduct.available_stock || 0}
                            onChange={(e) => setEditingProduct({ ...editingProduct, available_stock: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Product Images (Upload at least 3) *</label>
                        <div className="space-y-2">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                type="text"
                                required={i === 0}
                                value={editingProduct.images?.[i] || ''}
                                onChange={(e) => {
                                  const imgs = [...(editingProduct.images || [])];
                                  imgs[i] = e.target.value;
                                  setEditingProduct({ ...editingProduct, images: imgs });
                                }}
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                                placeholder={`Image ${i + 1} URL`}
                              />
                              <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0">
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleImageUploadFile(e, (url) => {
                                    const imgs = [...(editingProduct.images || [])];
                                    imgs[i] = url;
                                    setEditingProduct({ ...editingProduct, images: imgs });
                                  })}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Short Description</label>
                        <input
                          type="text"
                          value={editingProduct.short_description || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                        <textarea
                          rows={3}
                          value={editingProduct.description || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      {/* Homepage Assignments (Note: Prohibited product-level activate/deactivate toggle is omitted!) */}
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                        <span className="font-bold text-amber-900 block">Homepage Section Assignments:</span>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingProduct.festive_deal}
                              onChange={(e) => setEditingProduct({ ...editingProduct, festive_deal: e.target.checked ? 1 : 0 })}
                              className="accent-[#093824]"
                            />
                            <span>⚡ Featured Festive Deals</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingProduct.spotlight}
                              onChange={(e) => setEditingProduct({ ...editingProduct, spotlight: e.target.checked ? 1 : 0 })}
                              className="accent-[#093824]"
                            />
                            <span>Spotlight Products</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingProduct.new_launch}
                              onChange={(e) => setEditingProduct({ ...editingProduct, new_launch: e.target.checked ? 1 : 0 })}
                              className="accent-[#093824]"
                            />
                            <span>New Launch</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsProductModalOpen(false)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingProduct}
                          className="px-5 py-2 bg-[#093824] text-amber-300 font-bold rounded-xl hover:bg-emerald-900 transition shadow disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingProduct && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{savingProduct ? 'Saving Record...' : 'Save Product'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Categories Taxonomy (Collections)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organize categories and nested subcategories across Pakistan
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory({ name: '', icon: 'Folder', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80', description: '', display_order: 0 });
                    setIsCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <img src={cat.image} alt={cat.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-900" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">slug: /{cat.slug}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-2">{cat.description}</p>

                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">Subcategories:</span>
                        <div className="flex flex-wrap gap-1">
                          {cat.subcategories?.map((s) => (
                            <span key={s.id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">{cat.product_count || 0} products</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Edit/Create Modal */}
              {isCategoryModalOpen && editingCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {editingCategory.id ? 'Edit Category' : 'Create New Category'}
                      </h3>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                        <input
                          type="text"
                          required
                          value={editingCategory.name || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Image URL or Upload *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editingCategory.image || ''}
                            onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                          <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUploadFile(e, (url) => setEditingCategory({ ...editingCategory, image: url }))}
                            />
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={editingCategory.description || ''}
                          onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Display Order</label>
                        <input
                          type="number"
                          value={editingCategory.display_order ?? 0}
                          onChange={(e) => setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(false)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingCategory}
                          className="px-5 py-2 bg-[#093824] text-amber-300 font-bold rounded-xl text-xs shadow disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingCategory && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{savingCategory ? 'Saving Category...' : 'Save Category'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ORDERS & FULFILLMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Orders & Fulfillment
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update order progress, verify payments, and issue tracking IDs
                  </p>
                </div>
              </div>

              {/* Order Search & Summary Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Order Number, Transaction ID, Phone, Customer..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#093824]"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-600">
                    Total: <strong className="text-slate-900">{orders.length}</strong>
                  </span>
                  <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl font-medium text-amber-800">
                    Pending: <strong>{orders.filter((o) => o.order_status === 'Pending').length}</strong>
                  </span>
                  <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl font-medium text-emerald-800">
                    Delivered: <strong>{orders.filter((o) => o.order_status === 'Delivered').length}</strong>
                  </span>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Order ID & Date</th>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Transaction ID & Payment</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Order Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            No orders found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o) => {
                          const txId = o.transaction_id || o.transaction_ref;
                          return (
                            <tr key={o.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-[#093824] block text-xs sm:text-sm">
                                  {o.id || 'N/A'}
                                </span>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {formatDate(o.created_at)}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900">{o.customer_name || 'Guest'}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{o.phone || 'N/A'}</p>
                                <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                  {o.city || 'Pakistan'}{o.province ? `, ${o.province}` : ''}
                                </p>
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        o.payment_method === 'jazzcash'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : o.payment_method === 'easypaisa'
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : o.payment_method === 'hbl'
                                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {o.payment_method || 'COD'}
                                    </span>
                                  </div>

                                  {txId ? (
                                    <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 px-2 py-1 rounded-lg transition">
                                      <span className="font-mono font-bold text-slate-900 text-[11px]">
                                        {txId}
                                      </span>
                                      <button
                                        onClick={(e) => handleCopyTransactionId(txId, e)}
                                        className="text-slate-500 hover:text-emerald-800 transition p-0.5"
                                        title="Copy Transaction ID"
                                      >
                                        {copiedTxId === txId ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic block">
                                      No TxID provided
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                                      o.payment_status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : o.payment_status === 'failed' || o.payment_status === 'cancelled'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {o.payment_status || 'pending'}
                                  </span>
                                  {o.payment_status !== 'paid' && (
                                    <button
                                      onClick={() => handleQuickMarkPaid(o.id)}
                                      className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold"
                                      title="Mark Paid & Confirm"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                                Rs. {formatPrice(extractOrderTotal(o))}
                              </td>

                              <td className="py-3 px-4">
                                <select
                                  value={o.order_status}
                                  onChange={(e) => handleQuickStatusChange(o.id, e.target.value)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none cursor-pointer ${
                                    o.order_status === 'Delivered'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : o.order_status === 'Shipped' || o.order_status === 'Ready to Ship'
                                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                                      : o.order_status === 'Cancelled'
                                      ? 'bg-rose-50 text-rose-900 border-rose-300'
                                      : 'bg-amber-50 text-amber-900 border-amber-300'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Ready to Ship">Ready to Ship</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleOpenOrderManage(o)}
                                  className="px-3 py-1.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold rounded-xl text-xs transition shadow-sm"
                                >
                                  Manage & Fulfill
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Detail & Fulfillment Modal */}
              {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
                  <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto no-scrollbar">
                    
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl sm:text-2xl font-bold text-[#093824]">
                            {selectedOrder.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            orderStatusDraft === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : orderStatusDraft === 'Shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {orderStatusDraft}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Placed on {formatDateTime(selectedOrder.created_at)}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveOrderChanges} className="space-y-5 text-xs">
                      
                      {/* Section 1: Transaction ID & Payment Verification */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-800" />
                            <span>Payment & Transaction Verification</span>
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Gateway: <strong className="uppercase text-slate-800">{selectedOrder.payment_method || 'COD'}</strong>
                          </span>
                        </div>

                        {/* Customer Transaction ID Display & Copy */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Customer Transaction ID / Receipt Number
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={transactionIdDraft}
                              onChange={(e) => setTransactionIdDraft(e.target.value)}
                              placeholder="e.g. TID-98273919 or 382910298"
                              className="flex-1 px-3.5 py-2.5 bg-white border-2 border-emerald-900/30 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#093824]"
                            />
                            {transactionIdDraft && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyTransactionId(transactionIdDraft, e)}
                                className="px-3.5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-amber-300 font-bold rounded-xl flex items-center gap-1.5 transition shrink-0"
                                title="Copy Transaction ID"
                              >
                                {copiedTxId === transactionIdDraft ? (
                                  <>
                                    <Check className="w-4 h-4 text-amber-300" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    <span>Copy TxID</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 block">
                            Verify this reference against your JazzCash, Easypaisa, or HBL Bank merchant statement.
                          </span>
                        </div>

                        {/* Payment Status Dropdown & Quick Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 items-center">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Payment Status
                            </label>
                            <select
                              value={paymentStatusDraft}
                              onChange={(e) => setPaymentStatusDraft(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#093824]"
                            >
                              <option value="pending">Pending (Awaiting Verification)</option>
                              <option value="paid">Paid (Payment Received & Verified)</option>
                              <option value="failed">Failed / Invalid Reference</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>

                          <div className="sm:text-right pt-2 sm:pt-4">
                            {paymentStatusDraft !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentStatusDraft('paid');
                                  if (orderStatusDraft === 'Pending') setOrderStatusDraft('Confirmed');
                                  showFeedback('Payment marked as Paid. Click "Save Order Updates" to confirm.');
                                }}
                                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Paid & Confirmed</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Order Fulfillment & Courier Tracking */}
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-800" />
                          <span>Order Status & Courier Dispatch</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Order Status *
                            </label>
                            <select
                              value={orderStatusDraft}
                              onChange={(e) => setOrderStatusDraft(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#093824]"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Processing">Processing</option>
                              <option value="Ready to Ship">Ready to Ship</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                              <option value="Returned">Returned</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Courier Partner
                            </label>
                            <select
                              value={courierDraft}
                              onChange={(e) => setCourierDraft(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#093824]"
                            >
                              <option value="TCS Express">TCS Express</option>
                              <option value="Leopards Courier">Leopards Courier</option>
                              <option value="Trax Logistics">Trax Logistics</option>
                              <option value="PostEx">PostEx</option>
                              <option value="Call Courier">Call Courier</option>
                              <option value="M&P Express">M&P Express</option>
                              <option value="Rider Delivery">Rider Delivery</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Consignment / Tracking #
                            </label>
                            <input
                              type="text"
                              value={trackingDraft}
                              onChange={(e) => setTrackingDraft(e.target.value)}
                              placeholder="e.g. 77019283719"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#093824]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Customer & Shipping Details */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Delivery Destination
                        </span>
                        <p className="font-bold text-slate-900 text-sm">{selectedOrder.customer_name || 'Guest Customer'}</p>
                        <p className="text-slate-600 font-mono">Mobile: {selectedOrder.phone || 'N/A'}</p>
                        {selectedOrder.customer_email && (
                          <p className="text-slate-600">Email: {selectedOrder.customer_email}</p>
                        )}
                        <p className="text-slate-700">
                          {selectedOrder.street_address || 'N/A'}, {selectedOrder.area || ''}
                        </p>
                        <p className="text-slate-700">
                          {selectedOrder.city || 'Pakistan'}{selectedOrder.province ? `, ${selectedOrder.province}` : ''}, Pakistan
                        </p>
                        {selectedOrder.landmark && (
                          <p className="text-slate-500 italic">Landmark: {selectedOrder.landmark}</p>
                        )}
                        {selectedOrder.order_notes && (
                          <p className="text-amber-800 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200">
                            <strong>Note:</strong> {selectedOrder.order_notes}
                          </p>
                        )}
                      </div>

                      {/* Section 4: Itemized Order Products */}
                      {selectedOrder.items && selectedOrder.items.length > 0 && (
                        <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                          <span className="font-bold text-slate-800 block text-xs">
                            Order Items ({selectedOrder.items.length}):
                          </span>
                          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto no-scrollbar pr-1">
                            {selectedOrder.items.map((it) => {
                              const uPrice = extractItemUnitPrice(it);
                              const lineTot = extractItemTotal(it);
                              return (
                                <div key={it.id || Math.random()} className="py-2 flex items-center justify-between text-xs gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={it.image_url || '/icon.svg'}
                                      alt={it.product_name}
                                      className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                                    />
                                    <div className="truncate">
                                      <p className="font-semibold text-slate-800 truncate">{it.product_name}</p>
                                      <p className="text-slate-500 text-[11px]">
                                        Qty: {it.quantity || 1} · Price: Rs. {formatPrice(uPrice)} {it.variant_title && `· ${it.variant_title}`}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-bold text-slate-900 tabular-nums shrink-0">
                                    Rs. {formatPrice(lineTot)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Section 5: Financial Summary */}
                      {(() => {
                        const sub = extractOrderSubtotal(selectedOrder);
                        const grand = extractOrderTotal(selectedOrder);
                        const discount = Number(selectedOrder.discount || 0);
                        const shipping = Number(selectedOrder.shipping_fee !== undefined && selectedOrder.shipping_fee !== null ? selectedOrder.shipping_fee : (sub >= 9999 ? 0 : 290));

                        return (
                          <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between text-slate-600">
                              <span>Subtotal</span>
                              <span className="tabular-nums font-semibold text-slate-900">Rs. {formatPrice(sub)}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-emerald-700 font-semibold">
                                <span>Discount</span>
                                <span className="tabular-nums">- Rs. {formatPrice(discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-600">
                              <span>Delivery Charges</span>
                              <span className="tabular-nums font-medium text-slate-800">
                                {shipping === 0 ? 'FREE' : `Rs. ${formatPrice(shipping)}`}
                              </span>
                            </div>
                            <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                              <span>Total Amount</span>
                              <span className="tabular-nums text-[#093824]">
                                Rs. {formatPrice(grand)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Modal Actions */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(null)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingOrder}
                          className="px-6 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingOrder && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{savingOrder ? 'Saving Order...' : 'Save Order Changes'}</span>
                        </button>
                      </div>

                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HOMEPAGE 7 SECTIONS CONTROL */}
          {activeTab === 'homepage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Homepage 7 Sections Controls
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize titles, toggle visibility, and adjust presentation order
                  </p>
                </div>
                <button
                  onClick={handleSaveSections}
                  disabled={savingSections}
                  className="px-5 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSections && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingSections ? 'Saving Sections...' : 'Save Section Settings'}</span>
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((sec, idx) => (
                  <div key={sec.section_key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-emerald-800 font-bold block">{sec.section_key}</span>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const updated = [...sections];
                            updated[idx].title = e.target.value;
                            setSections(updated);
                          }}
                          className="font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-[#093824] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!sec.is_enabled}
                          onChange={(e) => {
                            const updated = [...sections];
                            updated[idx].is_enabled = e.target.checked ? 1 : 0;
                            setSections(updated);
                          }}
                          className="accent-[#093824]"
                        />
                        <span>Visible on Storefront</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PROMOTIONAL BANNERS */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Carousel Promotional Banners
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage the top hero image slides and call-to-action destinations
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingBanner({ title: '', subtitle: '', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80', cta_text: 'Shop Now', cta_url: '/', display_order: 1, is_active: 1 });
                    setIsBannerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Banner</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {banners.map((ban) => (
                  <div key={ban.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                      <img src={ban.image_url} alt={ban.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-2 text-xs flex flex-col justify-between flex-1">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{ban.title}</h4>
                        <p className="text-slate-500 line-clamp-2 mt-1">{ban.subtitle}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
                        <span className="font-semibold text-emerald-800">CTA: {ban.cta_text}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBanner(ban);
                              setIsBannerModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                            title="Edit Banner"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(ban.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg"
                            title="Delete Banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Banner Modal */}
              {isBannerModalOpen && editingBanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {editingBanner.id ? 'Edit Banner Slide' : 'Create Banner Slide'}
                      </h3>
                      <button onClick={() => setIsBannerModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Title *</label>
                        <input
                          type="text"
                          required
                          value={editingBanner.title || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={editingBanner.subtitle || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Image URL or Upload *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editingBanner.image_url || ''}
                            onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                          <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUploadFile(e, (url) => setEditingBanner({ ...editingBanner, image_url: url }))}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">CTA Text</label>
                          <input
                            type="text"
                            value={editingBanner.cta_text || 'Shop Now'}
                            onChange={(e) => setEditingBanner({ ...editingBanner, cta_text: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">CTA URL</label>
                          <input
                            type="text"
                            value={editingBanner.cta_url || '/'}
                            onChange={(e) => setEditingBanner({ ...editingBanner, cta_url: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <button type="button" onClick={() => setIsBannerModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingBanner}
                          className="px-5 py-2 bg-[#093824] text-amber-300 font-bold rounded-xl text-xs shadow disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingBanner && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{savingBanner ? 'Saving Banner...' : 'Save Banner'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LAUNCH SOON */}
          {activeTab === 'launch_soon' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Launch Soon Upcoming Products
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upcoming product releases with VIP registration notification alerts
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingLaunchSoon({ product_name: '', short_description: '', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', expected_launch_date: 'December 15, 2026', coming_soon_badge: 'Coming Soon', display_order: 1, is_active: 1 });
                    setIsLaunchSoonModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Upcoming Drop</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {launchSoon.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 space-y-2 text-xs flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[10px] font-bold text-amber-700">{item.coming_soon_badge}</span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{item.product_name}</h4>
                        <p className="text-slate-500 line-clamp-2 mt-1">{item.short_description}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-3">
                        <p className="font-semibold text-emerald-800">Date: {item.expected_launch_date}</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingLaunchSoon(item);
                              setIsLaunchSoonModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-lg"
                            title="Edit Drop"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLaunchSoon(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-lg"
                            title="Delete Drop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Launch Soon Modal */}
              {isLaunchSoonModalOpen && editingLaunchSoon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {editingLaunchSoon.id ? 'Edit Upcoming Drop' : 'Create Upcoming Drop'}
                      </h3>
                      <button onClick={() => setIsLaunchSoonModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveLaunchSoon} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                        <input
                          type="text"
                          required
                          value={editingLaunchSoon.product_name || ''}
                          onChange={(e) => setEditingLaunchSoon({ ...editingLaunchSoon, product_name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Image URL or Upload *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editingLaunchSoon.image_url || ''}
                            onChange={(e) => setEditingLaunchSoon({ ...editingLaunchSoon, image_url: e.target.value })}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                          <label className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-1 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUploadFile(e, (url) => setEditingLaunchSoon({ ...editingLaunchSoon, image_url: url }))}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Short Description *</label>
                        <textarea
                          rows={2}
                          required
                          value={editingLaunchSoon.short_description || ''}
                          onChange={(e) => setEditingLaunchSoon({ ...editingLaunchSoon, short_description: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Expected Launch Date</label>
                          <input
                            type="text"
                            value={editingLaunchSoon.expected_launch_date || ''}
                            onChange={(e) => setEditingLaunchSoon({ ...editingLaunchSoon, expected_launch_date: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Badge Text</label>
                          <input
                            type="text"
                            value={editingLaunchSoon.coming_soon_badge || 'Coming Soon'}
                            onChange={(e) => setEditingLaunchSoon({ ...editingLaunchSoon, coming_soon_badge: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <button type="button" onClick={() => setIsLaunchSoonModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs">
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingLaunchSoon}
                          className="px-5 py-2 bg-[#093824] text-amber-300 font-bold rounded-xl text-xs shadow disabled:opacity-50 flex items-center gap-2"
                        >
                          {savingLaunchSoon && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>{savingLaunchSoon ? 'Saving Drop...' : 'Save Drop'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Discount Coupons
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create discount codes for Pakistani promotions & checkout
                </p>
              </div>

              {/* Create coupon form */}
              <form onSubmit={handleCreateCoupon} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EID2026"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed PKR (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Order Amount (PKR)</label>
                  <input
                    type="number"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="px-4 py-2 bg-[#093824] text-amber-300 font-bold rounded-xl hover:bg-emerald-900 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCoupon && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingCoupon ? 'Creating...' : 'Create Coupon'}</span>
                </button>
              </form>

              {/* Coupons List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Value</th>
                      <th className="py-3 px-4">Min Order</th>
                      <th className="py-3 px-4">Used Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {coupons.map((cp) => (
                      <tr key={cp.id}>
                        <td className="py-3 px-4 font-mono font-bold text-[#093824]">{cp.code}</td>
                        <td className="py-3 px-4 uppercase">{cp.discount_type}</td>
                        <td className="py-3 px-4 font-bold tabular-nums">
                          {cp.discount_type === 'percentage' ? `${cp.discount_value}%` : `Rs. ${cp.discount_value}`}
                        </td>
                        <td className="py-3 px-4 tabular-nums">Rs. {cp.min_order_amount.toLocaleString('en-PK')}</td>
                        <td className="py-3 px-4 tabular-nums">{cp.usage_count} times</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS & GATEWAYS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Payment Gateways & Store Settings
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure JazzCash, Easypaisa, free delivery thresholds, and contact info
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-xs">
                
                {/* Shipping & Delivery Config */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Nationwide Shipping Rules</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Free Shipping Threshold (PKR)</label>
                      <input
                        type="number"
                        value={settings['free_shipping_threshold'] || '3000'}
                        onChange={(e) => setSettings({ ...settings, free_shipping_threshold: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Standard Shipping Fee (PKR)</label>
                      <input
                        type="number"
                        value={settings['default_shipping_fee'] || '200'}
                        onChange={(e) => setSettings({ ...settings, default_shipping_fee: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Cash on Delivery (COD) Enabled</label>
                      <select
                        value={settings['cod_enabled'] || 'true'}
                        onChange={(e) => setSettings({ ...settings, cod_enabled: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="true">Enabled Nationwide</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* JazzCash Merchant Credentials */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center justify-between">
                    <span>JazzCash Integration Credentials</span>
                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Official Adapter</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Merchant ID</label>
                      <input
                        type="text"
                        value={settings['jazzcash_merchant_id'] || 'MC12345_TEST'}
                        onChange={(e) => setSettings({ ...settings, jazzcash_merchant_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gateway Mode</label>
                      <select
                        value={settings['jazzcash_sandbox'] || 'true'}
                        onChange={(e) => setSettings({ ...settings, jazzcash_sandbox: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="true">Sandbox (Safe Test Simulator)</option>
                        <option value="false">Live Production Merchant</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Easypaisa Merchant Credentials */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center justify-between">
                    <span>Easypaisa Integration Credentials</span>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Official Adapter</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Store ID</label>
                      <input
                        type="text"
                        value={settings['easypaisa_store_id'] || 'EP_STORE_9981'}
                        onChange={(e) => setSettings({ ...settings, easypaisa_store_id: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gateway Mode</label>
                      <select
                        value={settings['easypaisa_sandbox'] || 'true'}
                        onChange={(e) => setSettings({ ...settings, easypaisa_sandbox: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="true">Sandbox (Safe Test Simulator)</option>
                        <option value="false">Live Production Merchant</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Support Numbers */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Customer Helplines & Contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">WhatsApp Support (Active Orders)</label>
                      <input
                        type="text"
                        value={settings['support_whatsapp'] || '03719150297'}
                        onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Official Support Email</label>
                      <input
                        type="email"
                        value={settings['support_email'] || 'contact.to.atal@gmail.com'}
                        onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Helpline Phone (Toll-Free)</label>
                      <input
                        type="text"
                        value={settings['support_phone'] || '+92 42 3578 9900'}
                        onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-900 text-sm border-b pb-2">Official Social Media Profiles</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">TikTok Link</label>
                      <input
                        type="text"
                        value={settings['social_tiktok'] || 'https://www.tiktok.com/@atal.pakistan'}
                        onChange={(e) => setSettings({ ...settings, social_tiktok: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Instagram Link</label>
                      <input
                        type="text"
                        value={settings['social_instagram'] || 'https://www.instagram.com/atal.pakistan?stkn=dXM2NTl0bHBzZ21n'}
                        onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Facebook Page Link</label>
                      <input
                        type="text"
                        value={settings['social_facebook'] || 'https://www.facebook.com/share/1DgG52novy/'}
                        onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{savingSettings ? 'Saving Settings...' : 'Save All Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: STAFF ACCOUNTS & PASSWORD MANAGEMENT */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Staff Accounts & Password Management
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage Administrator & Employee credentials, change staff passwords, and reset to default credentials
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-[#093824] font-bold text-xs rounded-xl shadow transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Default Passwords</span>
                </button>
              </div>

              {/* Staff Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Admin Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-400 text-[#093824] text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Full Super Admin
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Administrator Account</h3>
                      <p className="text-xs text-emerald-700 font-mono font-medium">uatal.pk@gmail.com</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Access Role:</span>
                      <span className="font-semibold text-slate-800 uppercase">admin</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Default Password:</span>
                      <span className="font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded">Umer@9157</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Support WhatsApp:</span>
                      <span className="font-mono text-slate-700">03719150297</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Status:</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Active & Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employee Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#093824] text-amber-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Store Operations
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Employee Account</h3>
                      <p className="text-xs text-emerald-700 font-mono font-medium">ali@atal.com</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Access Role:</span>
                      <span className="font-semibold text-slate-800 uppercase">employee</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Default Password:</span>
                      <span className="font-mono font-bold text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded">Ali@297</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Store Role:</span>
                      <span className="text-slate-700">Order Dispatch & Inventory Staff</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Status:</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Active & Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Panel & Quick Reset Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form: Change Password */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <KeyRound className="w-5 h-5 text-[#093824]" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Change Staff Password</h3>
                      <p className="text-xs text-slate-500">Update credentials for either the administrator or employee account</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangeStaffPassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Select Account</label>
                      <select
                        value={selectedStaffUser}
                        onChange={(e) => setSelectedStaffUser(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        {staffList.length > 0 ? (
                          staffList.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.email} — {st.full_name || st.role} ({st.role.toUpperCase()})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="admin">uatal.pk@gmail.com (Administrator)</option>
                            <option value="emp">ali@atal.com (Employee)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Enter new password"
                            value={newStaffPassword}
                            onChange={(e) => setNewStaffPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Re-type password"
                            value={confirmStaffPassword}
                            onChange={(e) => setConfirmStaffPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">
                        Passwords are encrypted with HMAC-SHA256 and salted.
                      </p>
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="px-5 py-2.5 bg-[#093824] hover:bg-[#062819] text-amber-300 font-bold rounded-xl transition shadow disabled:opacity-50"
                      >
                        {changingPassword ? 'Updating...' : 'Save New Password'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Reset to Default Fast Action Card */}
                <div className="bg-gradient-to-br from-amber-50 to-emerald-50/50 p-6 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center text-amber-900 mb-3">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Reset to Default Passwords</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Need to restore official default access immediately? This feature resets both passwords back to default with one click:
                    </p>
                    <div className="mt-3 bg-white/90 p-3 rounded-xl border border-amber-200/60 text-xs space-y-1 font-mono">
                      <div><strong className="text-slate-800">Admin:</strong> Umer@9157</div>
                      <div><strong className="text-slate-800">Employee:</strong> Ali@297</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowResetConfirmModal(true)}
                    className="mt-5 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow"
                  >
                    Reset Credentials to Default
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  JSON Store Backup & Restore
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export valid database snapshot or restore records safely with validation safeguards
                </p>
              </div>

              {/* Export Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Diagnostic Persistence Test</h3>
                  <p className="text-xs text-slate-500">Run a live test to verify database read/write cycles persist.</p>
                </div>
                <button
                  onClick={runPersistenceDiagnostic}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-slate-900 font-bold text-xs rounded-xl hover:bg-amber-600 transition shadow"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Run Persistence Test</span>
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Download Complete Database Backup</h3>
                  <p className="text-xs text-slate-500">Includes all products, categories, orders, banners, settings and coupons.</p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#093824] text-amber-300 font-bold text-xs rounded-xl hover:bg-emerald-900 transition shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Import Box */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Restore from Backup JSON</h3>
                <textarea
                  rows={6}
                  placeholder="Paste valid backup JSON here..."
                  value={backupJson}
                  onChange={(e) => setBackupJson(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />

                {importStatus && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                    {importStatus}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleImportBackup(true)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-200 transition"
                  >
                    Validate & Dry Run
                  </button>
                  <button
                    onClick={() => handleImportBackup(false)}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow"
                  >
                    Execute Restore
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Reset to Default Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
              Reset Passwords to Default?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This will restore the default passwords for both official staff accounts:
            </p>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 mb-6 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">uatal.pk@gmail.com</span>
                <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">Umer@9157</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">ali@atal.com</span>
                <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">Ali@297</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resettingDefaults}
                onClick={handleResetToDefaults}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow disabled:opacity-50"
              >
                {resettingDefaults ? 'Resetting...' : 'Yes, Reset Passwords'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
