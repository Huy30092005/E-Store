import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Search, ShoppingCart, User, X } from "lucide-react";

export default function Navbar() {
  const { user, logout, cartCount, setCartOpen } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      navigate(`/all-products?search=${encodeURIComponent(searchQ.trim())}`);
      setSearchOpen(false);
      setSearchQ("");
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md py-3" : "bg-white/90 backdrop-blur py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">S</span>
          </div>
          <span className="font-display font-bold text-xl text-gray-900 group-hover:text-brand-600 transition-colors">
            SimTech
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { to: "/", label: "Home" },
            { to: "/all-products", label: "Shop" },
            { to: "/about", label: "About Us" },
            { to: "/contact", label: "Contact" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `nav-link text-sm font-medium pb-0.5 transition-colors ${
                  isActive ? "text-brand-600 active" : "text-gray-700 hover:text-brand-600"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          {user?.role === "seller" && (
            <NavLink
              to="/seller"
              className={({ isActive }) =>
                `nav-link text-sm font-medium pb-0.5 transition-colors ${
                  isActive ? "text-brand-600 active" : "text-gray-700 hover:text-brand-600"
                }`
              }
            >
              Seller Dashboard
            </NavLink>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search products…"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-gray-600 hover:text-brand-600 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 text-gray-600 hover:text-brand-600 transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-fade-up">
                {cartCount}
              </span>
            )}
          </button>

          {/* User */}
          {user ? (
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
              </button>
              <div className="absolute right-0 top-full hidden w-44 pt-2 group-hover:block z-50">
                <div className="bg-white shadow-xl rounded-xl border border-gray-100 py-1">
                  <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600">
                    My Orders
                  </Link>
                  <Link to="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600">
                    Account
                  </Link>
                  <hr className="my-1" />
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <User className="w-4 h-4" />
              Account
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {[
            { to: "/", label: "Home" },
            { to: "/all-products", label: "Shop" },
            { to: "/about", label: "About Us" },
            { to: "/contact", label: "Contact" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block py-2 text-sm font-medium ${isActive ? "text-brand-600" : "text-gray-700"}`
              }
            >
              {label}
            </NavLink>
          ))}
          {!user && (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-center bg-brand-500 text-white py-2 rounded-lg text-sm font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
