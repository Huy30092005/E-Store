import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartSidebar from "./components/CartSidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatbotWidge from "./components/ChatbotWidget";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartSidebar from "./components/CartSidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatbotWidget from "./components/ChatbotWidget";

import HomePage from "./pages/HomePage";
import AllProductsPage from "./pages/AllProductsPage";
import ProductPage from "./pages/ProductPage";
import AuthPage from "./pages/AuthPage";
import CheckoutPage from "./pages/CheckoutPage";
import StripeVerifyPage from "./pages/StripeVerifyPage";
import OrdersPage, { OrderDetailPage } from "./pages/OrdersPage";
import SellerDashboard from "./pages/SellerDashboard";
import {
  AboutPage,
  ContactPage,
  AccountPage,
  ForgotPasswordPage,
} from "./pages/MiscPages";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="flex flex-col min-h-screen">
          <ScrollToTop />
          <Navbar />
          <CartSidebar />
          <div className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/all-products" element={<AllProductsPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

              {/* Protected */}
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/verify" element={<ProtectedRoute><StripeVerifyPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={
                <main className="pt-[72px] min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-8xl font-display font-black text-gray-100 mb-4">404</p>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h2>
                    <a href="/" className="text-brand-600 hover:underline text-sm">Go home</a>
                  </div>
                </main>
              } />
            </Routes>
          </div>
          <Footer />
          <ChatbotWidget />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
