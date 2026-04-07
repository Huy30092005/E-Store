import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { getFeatured } from "../services/api";
import ProductCard from "../components/ProductCard";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Gamepad2,
  Headphones,
  Laptop,
  Package,
  Smartphone,
  Volume2,
  Watch,
} from "lucide-react";

// ── Hero slides ──────────────────────────────────────────
const SLIDES = [
  {
    badge: "Limited Time Offer — 30% Off",
    title: "Experience Pure Sound",
    subtitle: "Your Perfect Headphones Awaits!",
    cta: "Buy Now",
    ctaLink: "/all-products?category=Audio",
    secondary: "Find More",
    bg: "from-brand-50 to-accent-100",
    accent: "#2DD4BF",
    Icon: Headphones,
  },
  {
    badge: "Hurry Up — Only a Few Left!",
    title: "Next-Level Gaming",
    subtitle: "Discover PlayStation 5 Today!",
    cta: "Shop Now",
    ctaLink: "/all-products?category=Gaming",
    secondary: "Explore Deals",
    bg: "from-brand-100 to-brand-200",
    accent: "#A855F7",
    Icon: Gamepad2,
  },
  {
    badge: "Exclusive Deal — 40% Off",
    title: "Power Meets Elegance",
    subtitle: "Apple MacBook Pro is Here for You!",
    cta: "Order Now",
    ctaLink: "/all-products?category=Laptops",
    secondary: "Learn More",
    bg: "from-slate-100 to-slate-300",
    accent: "#0F172A",
    Icon: Laptop,
  },
];

const CATEGORIES = [
  { name: "Audio", Icon: Headphones, slug: "Audio" },
  { name: "Gaming", Icon: Gamepad2, slug: "Gaming" },
  { name: "Laptops", Icon: Laptop, slug: "Laptops" },
  { name: "Phones", Icon: Smartphone, slug: "Phones" },
  { name: "Wearables", Icon: Watch, slug: "Wearables" },
  { name: "Cameras", Icon: Camera, slug: "Cameras" },
];

const FEATURED_ITEMS = [
  {
    Icon: Headphones,
    title: "Unparalleled Sound",
    desc: "Experience crystal-clear audio with premium headphones.",
    cat: "Audio",
  },
  {
    Icon: Volume2,
    title: "Stay Connected",
    desc: "Compact and stylish earphones for every occasion.",
    cat: "Audio",
  },
  {
    Icon: Laptop,
    title: "Power in Every Pixel",
    desc: "Shop the latest laptops for work, gaming, and more.",
    cat: "Laptops",
  },
];

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="skeleton aspect-square" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [slide, setSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const popularCarouselRef = useRef(null);

  const nextSlide = useCallback(() => setSlide((s) => (s + 1) % SLIDES.length), []);
  const prevSlide = useCallback(() => setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length), []);
  const scrollPopular = useCallback((direction) => {
    const container = popularCarouselRef.current;
    if (!container) return;

    const card = container.querySelector("[data-popular-card]");
    const gap = 24;
    const cardWidth = card ? card.getBoundingClientRect().width + gap : container.clientWidth * 0.85;

    container.scrollBy({
      left: direction * cardWidth * 2,
      behavior: "smooth",
    });
  }, []);

  // Auto-play
  useEffect(() => {
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes] = await Promise.all([getFeatured()]);
        setProducts(prodRes.data?.products || prodRes.data || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const current = SLIDES[slide];
  const HeroIcon = current.Icon;

  return (
    <main className="pt-[72px]">
      {/* ── Hero ─────────────────────────────────────── */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br ${current.bg} transition-all duration-700 min-h-[88vh] flex items-center`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-16 md:py-0 grid md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div className="space-y-5 animate-fade-up">
            <span className="inline-block bg-white/60 backdrop-blur text-gray-700 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/80">
              {current.badge}
            </span>
            <h1 className="font-display font-black text-5xl md:text-6xl leading-tight text-gray-900">
              {current.title}
              <span className="block text-brand-500">{current.subtitle}</span>
            </h1>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to={current.ctaLink}
                className="bg-gray-900 hover:bg-brand-600 text-white px-7 py-3.5 rounded-xl font-semibold transition-colors text-sm"
              >
                {current.cta}
              </Link>
              <Link
                to="/all-products"
                className="flex items-center gap-1.5 text-gray-700 hover:text-brand-600 font-medium text-sm transition-colors"
              >
                {current.secondary}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="flex items-center justify-center animate-fade-up">
            <HeroIcon className="w-40 h-40 md:w-52 md:h-52 text-gray-900/90" strokeWidth={1.5} />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button onClick={prevSlide} className="w-9 h-9 bg-white/70 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-2 rounded-full transition-all ${
                  i === slide ? "bg-brand-500 w-6" : "bg-gray-300 w-2"
                }`}
              />
            ))}
          </div>
          <button onClick={nextSlide} className="w-9 h-9 bg-white/70 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display font-bold text-2xl text-gray-900">Shop by Category</h2>
          <Link to="/all-products" className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1">
            All categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((item) => (
            <Link
              key={item.slug}
              to={`/all-products?category=${item.slug}`}
              className="group flex flex-col items-center gap-2 bg-white hover:bg-brand-50 border border-gray-100 hover:border-brand-200 rounded-2xl py-5 px-2 transition-all"
            >
              <item.Icon className="w-8 h-8 group-hover:scale-110 transition-transform text-gray-700 group-hover:text-brand-600" />
              <span className="text-xs font-medium text-gray-700 group-hover:text-brand-600 transition-colors">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular Products ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display font-bold text-2xl text-gray-900">Best Sellers</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollPopular(-1)}
              className="w-10 h-10 top-4 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center"
              aria-label="Scroll best sellers left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollPopular(1)}
              className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center"
              aria-label="Scroll best sellers right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/all-products" className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1">
              See more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div
          ref={popularCarouselRef}
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading
            ? Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  data-popular-card
                  className="snap-start shrink-0 basis-[78%] sm:basis-[48%] lg:basis-[31%] xl:basis-[23.5%]"
                >
                  <Skeleton />
                </div>
              ))
            : products.map((p) => (
                <div
                  key={p._id}
                  data-popular-card
                  className="snap-start shrink-0 basis-[78%] sm:basis-[48%] lg:basis-[31%] xl:basis-[23.5%]"
                >
                  <ProductCard product={p} />
                </div>
              ))}
        </div>

        {!loading && products.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">No products yet. Connect your Express backend!</p>
          </div>
        )}
      </section>

      {/* ── Featured 3-up ─────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-8">Featured Products</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURED_ITEMS.map((item) => (
              <Link
                key={item.title}
                to={`/all-products?category=${item.cat}`}
                className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all p-6 flex gap-4"
              >
                <item.Icon className="w-12 h-12 flex-shrink-0 text-brand-500 group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-brand-600 text-sm font-medium">
                    Buy now
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gaming Banner ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <h2 className="font-display font-black text-3xl md:text-4xl text-white leading-snug">
              Level Up Your Gaming Experience
            </h2>
            <p className="text-gray-400 text-sm">
              From immersive sound to precise controls — everything you need to win.
            </p>
            <Link
              to="/all-products?category=Gaming"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-7 py-3.5 rounded-xl font-semibold transition-colors text-sm"
            >
              Shop Gaming
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Gamepad2 className="w-28 h-28 md:w-36 md:h-36 text-white/90 flex-shrink-0" strokeWidth={1.5} />
        </div>
      </section>
    </main>
  );
}
