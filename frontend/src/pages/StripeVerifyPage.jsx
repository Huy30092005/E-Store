import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyStripeOrder } from "../services/api";
import { useApp } from "../context/AppContext";
import { AlertCircle, LoaderCircle, XCircle } from "lucide-react";

export default function StripeVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart, cart } = useApp();
  const [status, setStatus] = useState("loading");
  const orderId = searchParams.get("orderId");
  const success = searchParams.get("success") === "true";

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!orderId) {
        if (active) {
          setStatus("error");
        }
        return;
      }

      try {
        const res = await verifyStripeOrder(orderId, success);
        if (!active) return;

        if (success) {
          if (res.data.success === false) {
            setStatus("error");
            return;
          }
          await clearCart(cart);
          navigate(`/orders/${orderId}?success=1`, { replace: true });
          return;
        }

        setStatus("cancelled");
      } catch {
        if (active) {
          setStatus("error");
        }
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [orderId, success, clearCart, cart, navigate]);

  if (status === "loading") {
    return (
      <main className="pt-[72px] min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center max-w-md w-full">
          <LoaderCircle className="w-10 h-10 mx-auto text-brand-500 animate-spin" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Verifying payment</h1>
          <p className="mt-2 text-sm text-gray-500">We&apos;re confirming your Stripe checkout and updating the order.</p>
        </div>
      </main>
    );
  }

  if (status === "cancelled") {
    return (
      <main className="pt-[72px] min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center max-w-md w-full">
          <XCircle className="w-10 h-10 mx-auto text-amber-500" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Payment cancelled</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your Stripe checkout was cancelled, so the order was not completed.
          </p>
          <Link
            to="/checkout"
            className="inline-flex mt-6 bg-brand-500 hover:bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            Return to Checkout
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-[72px] min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center max-w-md w-full">
        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Payment verification failed</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t confirm this Stripe payment. Please try again or contact support.
        </p>
        <Link
          to="/checkout"
          className="inline-flex mt-6 border border-gray-200 hover:border-brand-400 text-gray-700 hover:text-brand-600 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          Back to Checkout
        </Link>
      </div>
    </main>
  );
}
