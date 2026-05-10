import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getOrders, getOrder, addComment } from "../services/api";
import { ArrowLeft, Check, Package, SearchX } from "lucide-react";

const STATUS_COLORS = {
  pending:    "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
};

// ── Star rating ──────────────────────────────────────────
function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-3xl transition-colors ${star <= value ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ── Toast notification ───────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === "success";
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium transition-all duration-300 ${
        isSuccess
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      <span className="text-base">{isSuccess ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

// ── Rate product modal ───────────────────────────────────
function RateProductModal({ open, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    onSubmit({ rating, content });
    setRating(0);
    setContent("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative mx-4">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="font-semibold text-lg mb-1 text-gray-900">Rate the Product</h2>
        <p className="text-sm text-gray-400 mb-5">Share your experience with other customers.</p>

        {/* Stars */}
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Your rating</p>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
            </p>
          )}
        </div>

        {/* Text */}
        <div className="mb-5 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Your review</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none text-gray-700 placeholder-gray-300"
            rows={4}
            placeholder="Write your review here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <button
          className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={rating === 0 || !content.trim()}
        >
          Submit Review
        </button>
      </div>
    </div>
  );
}

// ── Single order detail ──────────────────────────────────
export function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getOrder(id)
      .then((res) => setOrder(res.data))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReviewSubmit = async ({ rating, content }) => {
    try {
      await addComment(order.items?.[0]?.product?._id, { rating, content });
      showToast("success", "Review submitted successfully!");
    } catch {
      showToast("error", "Failed to submit review. Please try again.");
    }
  };

  if (loading) return (
    <main className="pt-[72px] min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
    </main>
  );

  if (!order) return (
    <main className="pt-[72px] min-h-screen flex items-center justify-center">
      <div className="text-center">
        <SearchX className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600 mb-2">Order not found</p>
        <Link to="/orders" className="text-brand-600 hover:underline text-sm">View all orders</Link>
      </div>
    </main>
  );

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-green-800">Order Placed Successfully!</h2>
              <p className="text-green-700 text-sm mt-0.5">Thank you for your purchase. You'll get a confirmation email soon.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Order #{order._id?.slice(-8).toUpperCase()}</h1>
            <p className="text-gray-500 text-sm mt-1">{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
            {order.status}
          </span>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-900 mb-4">Items</h2>
          <div className="space-y-4">
            {order.items?.map((item) => (
              <div key={item._id || `${item.product?._id}-${item.model}`} className="flex gap-4 items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{item.product?.name}</p>
                  {item.model && item.model !== "default" && (
                    <p className="text-gray-500 text-xs mt-0.5">Model: {item.model}</p>
                  )}
                  <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold text-sm text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <hr className="my-4 border-gray-100" />
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>${order.totalAmount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping */}
        {order.shippingAddress && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
            <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {order.shippingAddress.name}<br />
              {order.shippingAddress.address}<br />
              {order.shippingAddress.city}, {order.shippingAddress.zip}<br />
              {order.shippingAddress.country}
            </p>
          </div>
        )}

        {/* Rate the product */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-900 mb-1">Enjoyed your purchase?</h2>
          <p className="text-sm text-gray-400 mb-4">Let others know what you think.</p>
          <button
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            onClick={() => setModalOpen(true)}
          >
            Rate the Product
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/orders" className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-200 hover:border-brand-400 text-gray-700 hover:text-brand-600 py-3 rounded-xl text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Orders
          </Link>
          <Link to="/all-products" className="flex-1 text-center bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>

      <RateProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
      <Toast toast={toast} />
    </main>
  );
}

// ── Orders list ──────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-bold text-3xl text-gray-900 mb-8">My Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 text-sm mb-6">Your order history will appear here</p>
            <Link to="/all-products" className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="block bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Order #{order._id?.slice(-8).toUpperCase()}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status}
                    </span>
                    <span className="font-bold text-gray-900">${order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {order.items?.slice(0, 4).map((item, i) => (
                    <div key={i} className="w-10 h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                      <img src={item.product?.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {order.items?.length > 4 && (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 font-medium">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}