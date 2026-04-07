import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";

export default function CartSidebar() {
  const { cart, cartOpen, setCartOpen, cartTotal, updateQuantity, removeFromCart } = useApp();

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-display font-bold text-xl text-gray-900">
            Your Cart
            {cart.length > 0 && (
              <span className="ml-2 text-sm font-body text-gray-400 font-normal">
                ({cart.length} item{cart.length !== 1 ? "s" : ""})
              </span>
            )}
          </h2>
          <button
            onClick={() => setCartOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-10 h-10 text-brand-300" strokeWidth={1.5} />
              </div>
              <p className="text-gray-500 text-sm mb-4">Your cart is empty</p>
              <button
                onClick={() => setCartOpen(false)}
                className="bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.product._id}-${item.model}`} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                  {item.model && item.model !== "default" && (
                    <p className="text-xs text-gray-500 mt-0.5">Model: {item.model}</p>
                  )}
                  <p className="text-brand-600 font-bold text-sm mt-0.5">
                    ${item.product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1, item.model)}
                      className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity + 1, item.model)}
                      className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.product._id, item.model)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-bold text-gray-800">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Subtotal</span>
              <span className="font-bold text-lg text-gray-900">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400">Shipping & taxes calculated at checkout</p>
            <Link
              to="/checkout"
              onClick={() => setCartOpen(false)}
              className="block w-full bg-brand-500 hover:bg-brand-600 text-white text-center py-3.5 rounded-xl font-semibold transition-colors"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={() => setCartOpen(false)}
              className="block w-full text-center text-sm text-gray-500 hover:text-brand-600 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
