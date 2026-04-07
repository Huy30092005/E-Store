import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mail,
  Paintbrush,
  Phone,
  PlugZap,
  ShoppingBag,
  Zap,
} from "lucide-react";

const VALUE_ITEMS = [
  {
    Icon: Zap,
    title: "Lightning Fast",
    desc: "Optimised for performance — instant loads, smooth interactions.",
  },
  {
    Icon: Paintbrush,
    title: "Beautiful Design",
    desc: "Minimal yet striking UI that puts your products first.",
  },
  {
    Icon: PlugZap,
    title: "API Ready",
    desc: "Connects seamlessly to any Express REST backend you build.",
  },
];

const CONTACT_ITEMS = [
  { Icon: Phone, label: "+1-234-567-890" },
  { Icon: Mail, label: "contact@SimTech.dev" },
];

export function AboutPage() {
  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 to-amber-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-brand-500" />
          <h1 className="font-display font-black text-5xl text-gray-900 mb-4">
            About SimTech
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            A modern, minimal, and fast e-commerce platform built with React
            and Express — designed to launch your store with ease.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-3 gap-6">
        {VALUE_ITEMS.map(({ Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 p-7 text-center hover:shadow-md transition-shadow">
            <Icon className="w-10 h-10 mx-auto mb-3 text-brand-500" />
            <h3 className="font-display font-bold text-xl text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 text-center">
        <Link
          to="/all-products"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-2xl font-semibold text-base transition-colors"
        >
          Start Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </main>
  );
}

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    // Wire this to your Express POST /api/contact endpoint
    setSent(true);
  };

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-orange-50 to-amber-100 py-20 px-4 text-center">
        <h1 className="font-display font-black text-5xl text-gray-900 mb-3">Contact Us</h1>
        <p className="text-gray-600">We'd love to hear from you.</p>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {sent ? (
          <div className="text-center py-12">
            <Mail className="w-14 h-14 mx-auto mb-4 text-brand-500" />
            <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Message Sent!</h2>
            <p className="text-gray-500 text-sm">We'll get back to you within 24 hours.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-8">
            <form onSubmit={submit} className="space-y-5">
              {[
                { name: "name", label: "Your Name", placeholder: "John Doe" },
                { name: "email", label: "Email Address", placeholder: "you@example.com", type: "email" },
              ].map(({ name, label, placeholder, type = "text" }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handle}
                  required
                  placeholder="How can we help?"
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 resize-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Send Message
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
              {CONTACT_ITEMS.map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
                  <Icon className="w-5 h-5 text-brand-500" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export function AccountPage() {
  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-gray-100 p-8">
          <h1 className="font-display font-bold text-3xl text-gray-900">Your Account</h1>
          <p className="text-gray-500 mt-3">
            Profile management is not wired up yet, but the route is now in place so
            the account menu no longer leads to a broken page.
          </p>
          <Link
            to="/orders"
            className="inline-flex mt-6 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            View Orders
          </Link>
        </div>
      </div>
    </main>
  );
}

export function ForgotPasswordPage() {
  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center">
          <h1 className="font-display font-bold text-3xl text-gray-900">
            Reset password
          </h1>
          <p className="text-gray-500 mt-3">
            The backend does not expose a password-reset flow yet. For now, this page
            keeps the sign-in screen from linking to a missing route.
          </p>
          <Link
            to="/login"
            className="inline-flex mt-6 bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
