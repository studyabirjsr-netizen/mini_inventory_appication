import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  Database, 
  AlertTriangle, 
  BarChart3, 
  Search, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Menu,
  MoreVertical,
  Download
} from "lucide-react";
 import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Product, TabType } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: 50 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md",
        type === 'success' ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
      )}
    >
      {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const Badge = ({ children, variant }: { children: React.ReactNode, variant: 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    info: "bg-info/10 text-info border-info/20",
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 w-fit", variants[variant])}>
      <span className={cn("w-1.5 h-1.5 rounded-full", variant === 'success' ? "bg-success" : variant === 'warning' ? "bg-warning" : variant === 'danger' ? "bg-danger" : "bg-info")} />
      {children}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'error' }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: '',
    price: 0,
    quantity: 0,
    expiryDate: '',
    discount: 0
  });

  const [bulkJson, setBulkJson] = useState("");

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter(p => p.available).length;
    const totalValue = products.reduce((acc, p) => acc + (p.discountedPrice * p.quantity), 0);
    
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    const expiringSoon = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      return expiry >= now && expiry <= sevenDaysLater;
    }).length;

    return { total, available, totalValue, expiringSoon };
  }, [products]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expiryDate: formData.expiryDate || null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add product");
      }
      addToast("Product added successfully", 'success');
      setFormData({ id: '', name: '', category: '', price: 0, quantity: 0, expiryDate: '', discount: 0 });
      fetchProducts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingProduct,
          expiryDate: editingProduct.expiryDate || null
        })
      });
      if (!res.ok) throw new Error("Failed to update product");
      addToast("Product updated successfully", 'success');
      setIsEditModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      addToast("Product deleted successfully", 'success');
      fetchProducts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleBulkImport = async () => {
    try {
      const data = JSON.parse(bulkJson);
      if (!Array.isArray(data)) throw new Error("Input must be a JSON array");
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Bulk import failed");
      const result = await res.json();
      addToast(`Successfully imported ${result.count} products`, 'success');
      setBulkJson("");
      fetchProducts();
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const loadSampleData = () => {
    const sample = [
      { "id":"P001","name":"Apple","category":"Fruits","price":100.0,"quantity":50,"expiryDate":"2026-03-01","discount":10.0 },
      { "id":"P002","name":"Banana","category":"Fruits","price":50.0,"quantity":100,"expiryDate":"2026-02-25","discount":5.0 },
      { "id":"P003","name":"Milk","category":"Dairy","price":80.0,"quantity":30,"expiryDate":"2026-02-24","discount":0.0 },
      { "id":"P004","name":"Cheese","category":"Dairy","price":250.0,"quantity":20,"expiryDate":"2026-04-10","discount":15.0 },
      { "id":"P005","name":"Shampoo","category":"Personal Care","price":300.0,"quantity":60,"expiryDate":null,"discount":20.0 },
      { "id":"P006","name":"Rice","category":"Grains","price":120.0,"quantity":200,"expiryDate":"2027-01-01","discount":0.0 }
    ];
    setBulkJson(JSON.stringify(sample, null, 2));
  };

  const getStatusBadge = (p: Product) => {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    if (!p.available) return <Badge variant="danger">Unavailable</Badge>;
    if (p.expiryDate) {
      const expiry = new Date(p.expiryDate);
      if (expiry <= sevenDaysLater) return <Badge variant="warning">Expiring Soon</Badge>;
    }
    return <Badge variant="success">Available</Badge>;
  };

  const calculateDaysRemaining = (dateStr: string | null) => {
    if (!dateStr) return null;
    const now = new Date();
    const expiry = new Date(dateStr);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // --- Render Sections ---

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Products", value: stats.total, icon: Package, color: "text-primary" },
          { label: "Available", value: stats.available, icon: CheckCircle2, color: "text-success" },
          { label: "Expiring Soon", value: stats.expiringSoon, icon: AlertTriangle, color: "text-warning" },
          { label: "Inventory Value", value: `$${stats.totalValue.toLocaleString()}`, icon: BarChart3, color: "text-info" },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-bg-card p-6 rounded-3xl border border-white/5 shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.label}</h3>
            <p className="text-3xl font-display font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-bg-card rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Inventory</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search summary..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-white/5">
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Qty</th>
                <th className="px-6 py-4 font-semibold">Expiry</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.slice(0, 8).map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-mono-tech text-xs text-info">{p.id}</td>
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{p.category}</td>
                  <td className="px-6 py-4 font-mono-tech text-sm">${p.discountedPrice}</td>
                  <td className="px-6 py-4 text-sm">{p.quantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{p.expiryDate || "—"}</td>
                  <td className="px-6 py-4">{getStatusBadge(p)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 hover:bg-danger/10 rounded-lg text-slate-400 hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAllProducts = () => (
    <div className="bg-bg-card rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Inventory Catalog</h2>
          <p className="text-slate-500 text-sm">Manage and monitor all your stock items.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, ID or category..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button 
            onClick={fetchProducts}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all active:scale-95"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
              <th className="px-6 py-5 font-bold">ID</th>
              <th className="px-6 py-5 font-bold">Product Details</th>
              <th className="px-6 py-5 font-bold">Category</th>
              <th className="px-6 py-5 font-bold">Pricing</th>
              <th className="px-6 py-5 font-bold">Stock</th>
              <th className="px-6 py-5 font-bold">Expiry</th>
              <th className="px-6 py-5 font-bold">Status</th>
              <th className="px-6 py-5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProducts.map((p) => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-mono-tech text-xs text-info">{p.id}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.category}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.category}</td>
                <td className="px-6 py-4">
                  <div className="font-mono-tech text-sm text-white">${p.discountedPrice}</div>
                  {p.discount > 0 && (
                    <div className="text-[10px] text-danger line-through opacity-50 font-mono-tech">${p.price}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium">{p.quantity}</div>
                  <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full", p.quantity < 10 ? "bg-danger" : p.quantity < 30 ? "bg-warning" : "bg-success")}
                      style={{ width: `${Math.min(p.quantity, 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.expiryDate || "N/A"}</td>
                <td className="px-6 py-4">{getStatusBadge(p)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }}
                      className="p-2 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-2 hover:bg-danger/10 rounded-xl text-slate-400 hover:text-danger transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAddProduct = () => (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-card p-8 rounded-[2rem] border border-white/5 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <PlusCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Add New Product</h2>
            <p className="text-slate-500 text-sm">Fill in the details to register a new item in the inventory.</p>
          </div>
        </div>

        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Product ID</label>
              <input 
                required
                type="text" 
                placeholder="e.g. P001"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Product Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Fuji Apple"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Category</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Fruits"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Original Price ($)</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Quantity</label>
              <input 
                required
                type="number" 
                min="0"
                step="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Discount (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Expiry Date (Optional)</label>
              <input 
                type="date" 
                value={formData.expiryDate}
                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
          >
            Register Product
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderBulkImport = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-bg-card p-8 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-info/10 text-info">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bulk Import</h2>
              <p className="text-slate-500 text-sm">Paste a JSON array to import multiple products at once.</p>
            </div>
          </div>
          <button 
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Download className="w-4 h-4" />
            Load Sample Data
          </button>
        </div>

        <div className="space-y-4">
          <textarea 
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            placeholder='[ { "id": "P001", "name": "...", ... } ]'
            className="w-full h-96 p-6 bg-bg-dark border border-white/5 rounded-3xl focus:ring-2 focus:ring-info/50 outline-none transition-all font-mono text-xs leading-relaxed"
          />
          <button 
            onClick={handleBulkImport}
            disabled={!bulkJson.trim()}
            className="w-full py-4 bg-info text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-info/90 transition-all shadow-xl shadow-info/20 disabled:opacity-50"
          >
            Execute Bulk Import
          </button>
        </div>
      </div>
    </div>
  );

  const renderExpiringSoon = () => {
    const expiringProducts = products.filter(p => {
      const days = calculateDaysRemaining(p.expiryDate);
      return days !== null && days >= 0 && days <= 7;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-warning/10 text-warning">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Expiring Soon</h2>
            <p className="text-slate-500 text-sm">Items reaching their expiry date within the next 7 days.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expiringProducts.map((p, i) => {
            const days = calculateDaysRemaining(p.expiryDate);
            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={p.id} 
                className="bg-bg-card p-6 rounded-3xl border border-warning/20 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold",
                    days! <= 2 ? "bg-danger text-white" : "bg-warning text-bg-dark"
                  )}>
                    <span className="text-lg leading-none">{days}</span>
                    <span className="text-[8px] uppercase">Days</span>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                  <Badge variant="warning">{p.category}</Badge>
                </div>
                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Product ID</span>
                    <span className="font-mono-tech text-info">{p.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiry Date</span>
                    <span className="text-white font-medium">{p.expiryDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Level</span>
                    <span className="text-white font-medium">{p.quantity} units</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                  <div className="font-mono-tech text-lg font-bold text-white">${p.discountedPrice}</div>
                  <button 
                    onClick={() => { setEditingProduct(p); setIsEditModalOpen(true); }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {expiringProducts.length === 0 && (
            <div className="col-span-full py-20 text-center bg-bg-card rounded-3xl border border-dashed border-white/10">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4 opacity-20" />
              <p className="text-slate-500">No products expiring within the next 7 days.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const categories = Array.from(new Set(products.map(p => p.category)));
    const categoryValues = categories.reduce((acc, cat) => {
      const val = products
        .filter(p => p.category === cat)
        .reduce((sum, p) => sum + (p.discountedPrice * p.quantity), 0);
      acc[cat] = val;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = Object.values(categoryValues).reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...Object.values(categoryValues), 1);

    return (
      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Inventory Value by Category</h2>
              <p className="text-slate-500 text-sm">Financial distribution of stock across different categories.</p>
            </div>
          </div>

          <div className="bg-bg-card p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
            {Object.entries(categoryValues).sort((a, b) => b[1] - a[1]).map(([cat, val], i) => (
              <div key={cat} className="space-y-2">
                <div className="flex justify-between text-sm font-bold uppercase tracking-widest">
                  <span className="text-slate-400">{cat}</span>
                  <span className="text-white">${val.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(val / maxVal) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 1 }}
                    className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                  />
                </div>
              </div>
            ))}
            <div className="pt-8 border-t border-white/5 flex justify-between items-center">
              <span className="text-lg font-bold text-slate-400">Grand Total Value</span>
              <span className="text-3xl font-display font-bold text-success">${totalValue.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-info/10 text-info">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Category Search</h2>
              <p className="text-slate-500 text-sm">Deep dive into specific product categories.</p>
            </div>
          </div>

          <div className="bg-bg-card p-6 rounded-3xl border border-white/5 mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Enter category name to filter..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border-none rounded-2xl text-lg focus:ring-2 focus:ring-info/50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-bg-card p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="font-mono-tech text-xs text-info">{p.id}</div>
                  {getStatusBadge(p)}
                </div>
                <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{p.category}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Price</div>
                    <div className="font-mono-tech text-xl font-bold text-white">${p.discountedPrice}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Stock</div>
                    <div className="text-lg font-bold text-white">{p.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  // --- Main Layout ---

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-dark">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-bg-card border-r border-white/5 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold text-white">InvenTech</h1>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'all', label: 'Inventory', icon: Package },
                { id: 'add', label: 'Add Product', icon: PlusCircle },
                { id: 'bulk', label: 'Bulk Import', icon: Database },
                { id: 'expiring', label: 'Expiring', icon: AlertTriangle, count: stats.expiringSoon },
                { id: 'reports', label: 'Reports', icon: BarChart3 },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as TabType); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group",
                    activeTab === item.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-widest">{item.label}</span>
                  </div>
                  {item.count ? (
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold",
                      activeTab === item.id ? "bg-white/20" : "bg-danger text-white"
                    )}>
                      {item.count}
                    </span>
                  ) : (
                    <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", activeTab === item.id && "opacity-100")} />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-white/5">
            <div className="bg-bg-dark rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-info" />
              <div>
                <div className="text-xs font-bold text-white">Admin User</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Master Access</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-bg-card/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-xl text-slate-400"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold uppercase tracking-widest text-white">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Online</span>
            </div>
            <button 
              onClick={() => setActiveTab('add')}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Quick Add
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'all' && renderAllProducts()}
              {activeTab === 'add' && renderAddProduct()}
              {activeTab === 'bulk' && renderBulkImport()}
              {activeTab === 'expiring' && renderExpiringSoon()}
              {activeTab === 'reports' && renderReports()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-bg-dark/50 backdrop-blur-sm flex items-center justify-center"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-bg-dark/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-bg-card border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Edit Product</h2>
                  <p className="text-slate-500 text-sm">Modify details for <span className="text-info font-mono">{editingProduct.id}</span></p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateProduct} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Product Name</label>
                    <input 
                      required
                      type="text" 
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Category</label>
                    <input 
                      required
                      type="text" 
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Price ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Quantity</label>
                    <input 
                      required
                      type="number" 
                      value={editingProduct.quantity}
                      onChange={(e) => setEditingProduct({...editingProduct, quantity: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Discount (%)</label>
                    <input 
                      type="number" 
                      value={editingProduct.discount}
                      onChange={(e) => setEditingProduct({...editingProduct, discount: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono-tech"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Expiry Date</label>
                    <input 
                      type="date" 
                      value={editingProduct.expiryDate || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, expiryDate: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-0 right-0 p-6 z-[200] space-y-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast 
              key={toast.id} 
              message={toast.message} 
              type={toast.type} 
              onClose={() => removeToast(toast.id)} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
