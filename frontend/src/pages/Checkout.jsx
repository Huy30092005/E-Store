import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createOrder, createStripeOrder } from "../services/api";
import { useApp } from "../context/AppContext";
import { CreditCard, Lock, ShoppingCart, Truck } from "lucide-react";

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, user } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    address: "",
    city: "",
    zip: "",
    country: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const orderPayload = {
      items: cart.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        model: item.model,
      })),
      shippingAddress: {
        name: form.name,
        email: form.email,
        address: form.address,
        city: form.city,
        zip: form.zip,
        country: form.country,
      },
    };

    try {
      if (paymentMethod === "stripe") {
        const res = await createStripeOrder(orderPayload);
        if (!res.data.sessionUrl) {
          throw new Error("Stripe checkout is unavailable right now.");
        }
        window.location.href = res.data.sessionUrl;
        return;
      }

      const res = await createOrder(orderPayload);
      await clearCart();
      navigate(`/orders/${res.data._id}?success=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Order failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shipping = cartTotal > 50 ? 0 : 9.99;
  const tax = cartTotal * 0.1;

  if (cart.length === 0) {
    return (
      <main className="pt-[72px] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
          <Link to="/all-products" className="text-brand-600 hover:underline text-sm">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display font-bold text-3xl text-gray-900 mb-8">Checkout</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={submit} className="lg:col-span-2 space-y-6">
            {/* Shipping */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Shipping Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: "name", label: "Full Name", placeholder: "John Doe", full: true },
                  { name: "email", label: "Email", placeholder: "you@example.com", type: "email", full: true },
                  { name: "address", label: "Address", placeholder: "123 Main St", full: true },
                  { name: "city", label: "City", placeholder: "New York" },
                  { name: "zip", label: "ZIP Code", placeholder: "10001" },
                  { name: "country", label: "Country", placeholder: "United States" },
                ].map(({ name, label, placeholder, type = "text", full }) => (
                  <div key={name} className={full ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
                    <input
                      type={type}
                      name={name}
                      value={form[name]}
                      onChange={handle}
                      required
                      placeholder={placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Payment Method</h2>
              <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Choose how you want to complete this order
              </p>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      paymentMethod === "cod"
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-xs text-gray-500 mt-1">Pay when your order arrives</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      paymentMethod === "stripe"
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Stripe</p>
                        <p className="text-xs text-gray-500 mt-1">Pay securely with card via Stripe</p>
                      </div>
                    </div>
                  </button>
                </div>

                {paymentMethod === "stripe" && (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Stripe Checkout</p>
                      <p className="text-sm text-gray-600 mt-1">
                        After you place the order, we&apos;ll redirect you to Stripe&apos;s hosted payment page to enter your card details securely.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Receipt Email</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handle}
                        required
                        placeholder="you@example.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 transition bg-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Your card information is collected on Stripe, not stored in this frontend.
                    </p>
                  </div>
                )}

                {paymentMethod === "cod" && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">Cash on Delivery selected</p>
                    <p className="text-sm text-gray-600 mt-1">
                      The admin panel will now record this order as COD instead of treating every checkout like cash payment.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white py-4 rounded-xl font-bold text-base transition-colors"
            >
              {loading
                ? paymentMethod === "stripe"
                  ? "Redirecting to Stripe…"
                  : "Placing Order…"
                : paymentMethod === "stripe"
                  ? `Continue to Stripe`
                  : `Place COD Order`}
            </button>
          </form>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {cart.map((item) => (
                  <div key={`${item.product._id}-${item.model}`} className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 font-medium truncate">{item.product.name}</p>
                      {item.model && item.model !== "default" && (
                        <p className="text-xs text-gray-500">Model: {item.model}</p>
                      )}
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <hr className="border-gray-100 mb-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (10%)</span><span>${tax.toFixed(2)}</span>
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span><span>${(cartTotal + shipping + tax).toFixed(2)}</span>
                </div>
              </div>
              {cartTotal < 50 && (
                <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
                  Add ${(50 - cartTotal).toFixed(2)} more for free shipping!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
