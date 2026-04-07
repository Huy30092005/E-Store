import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getMe,
  getCart,
  addToCart as apiAddToCart,
  updateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
  logoutSession,
} from "../services/api";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  // ── Bootstrap user session ────────────────────────────
  useEffect(() => {
    if (!token) {
      setUser(null);
      setCart([]);
      return;
    }

    let active = true;
    getMe()
      .then((res) => {
        if (active) {
          setUser(res.data);
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        if (active) {
          setToken(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  // ── Fetch cart when user is ready ────────────────────
  useEffect(() => {
    if (!user) return;
    getCart()
      .then((res) => setCart(res.data || []))
      .catch(() => setCart([]));
  }, [user]);

  const login = useCallback((userData, jwtToken) => {
    localStorage.setItem("token", jwtToken);
    setLoading(false);
    setToken(jwtToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    logoutSession();
    setLoading(false);
    setToken(null);
    setUser(null);
    setCart([]);
  }, []);

  // ── Cart helpers ──────────────────────────────────────
  const addToCart = useCallback(async (product, quantity = 1, model = "default") => {
    if (!user) { setCartOpen(true); return; }
    try {
      const res = await apiAddToCart(product._id, quantity, model);
      setCart(res.data);
    } catch {
      return;
    }
  }, [user]);

  const updateQuantity = useCallback(async (productId, quantity, model = "default") => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product._id === productId && item.model === model
          ? { ...item, quantity }
          : item
      )
    );
    try {
      const res = await updateCartItem(productId, quantity, model);
      setCart(res.data);
    } catch {
      return;
    }
  }, [cart]);

  const removeFromCart = useCallback(async (productId, model = "default") => {
    try {
      const res = await apiRemoveFromCart(productId, model);
      setCart(res.data);
    } catch {
      return;
    }
  }, [cart]);

  const clearCart = useCallback(async () => {
    try {
      await apiClearCart(cart);
      setCart([]);
    } catch {
      return;
    }
  }, [cart]);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );

  return (
    <AppContext.Provider
      value={{
        user, login, logout, loading,
        cart, cartCount, cartTotal,
        addToCart, updateQuantity, removeFromCart, clearCart,
        cartOpen, setCartOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
