import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Newsletter */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display font-bold text-white text-2xl">
              Subscribe & Get 20% Off
            </h3>
            <p className="text-gray-400 mt-1 text-sm">
              Join thousands of happy shoppers. No spam, ever.
            </p>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full max-w-md gap-2"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="sm:col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">Q</span>
            </div>
            <span className="font-display font-bold text-xl text-white">SimTech</span>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed">
            A modern e-commerce experience built with React & Express.
            Fast, minimal, and made to convert.
          </p>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            {["Home", "About Us", "Contact Us", "Privacy Policy"].map((l) => (
              <li key={l}>
                <Link to="/" className="hover:text-brand-400 transition-colors">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Shop */}
        <div>
          <h4 className="text-white font-semibold mb-4">Shop</h4>
          <ul className="space-y-2 text-sm">
            {["All Products", "New Arrivals", "Best Sellers", "Sale"].map((l) => (
              <li key={l}>
                <Link to="/all-products" className="hover:text-brand-400 transition-colors">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-brand-400" /> +1-234-567-890
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400" /> contact@SimTech.dev
            </li>
          </ul>
          <div className="flex gap-3 mt-5">
            {["twitter", "instagram", "facebook"].map((s) => (
              <a
                key={s}
                href="#"
                className="w-9 h-9 bg-gray-800 hover:bg-brand-500 rounded-lg flex items-center justify-center transition-colors"
              >
                <span className="text-xs font-bold text-gray-300 capitalize">{s[0].toUpperCase()}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800 py-5">
        <p className="text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} SimTech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
