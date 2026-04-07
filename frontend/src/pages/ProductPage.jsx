import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getProduct, getProducts } from "../services/api";
import { useApp } from "../context/AppContext";
import ProductCard from "../components/ProductCard";
import { Check, Minus, Plus, SearchX, Star } from "lucide-react";

const STATUS_META = {
  active: {
    label: "Available",
    badgeClass: "bg-emerald-100 text-emerald-700",
    message: "",
  },
  coming_soon: {
    label: "Coming Soon",
    badgeClass: "bg-amber-100 text-amber-700",
    message: "This product has been announced but is not available to order yet.",
  },
  discontinued: {
    label: "Discontinued",
    badgeClass: "bg-gray-200 text-gray-700",
    message: "This product is no longer sold, but the product page remains available for reference.",
  },
};

export default function ProductPage() {
  const { id } = useParams();
  const { addToCart } = useApp();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState("default");

  const markdownComponents = {
    p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
    strong: ({ children }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>,
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-7">{children}</li>,
    h1: ({ children }) => (
      <h1 className="mb-3 text-xl font-bold text-gray-900">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 text-lg font-bold text-gray-900">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 text-base font-semibold text-gray-900">{children}</h3>
    ),
  };

  useEffect(() => {
    setLoading(true);
    setImgIndex(0);
    setQty(1);
    setSelectedModel("default");
    getProduct(id)
      .then((res) => {
        setProduct(res.data);
        setSelectedModel(res.data.models?.[0] || "default");
        return getProducts({ category: res.data.category, limit: 4 });
      })
      .then((res) => {
        const data = res.data?.products || res.data || [];
        setRelated(data.filter((p) => p._id !== id).slice(0, 4));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, qty, selectedModel);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <main className="pt-[72px] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-10">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-6 w-1/3 rounded" />
            <div className="skeleton h-10 w-3/4 rounded" />
            <div className="skeleton h-8 w-1/4 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="pt-[72px] flex items-center justify-center min-h-screen">
        <div className="text-center">
          <SearchX className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Product not found</h2>
          <Link to="/all-products" className="text-brand-600 hover:underline text-sm">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const images = product.images?.length ? product.images : [product.image];
  const productModels = product.models?.length ? product.models : ["default"];
  const primaryCategory = product.categories?.[0] || product.category;
  const categoryLabel = product.categories?.length
    ? product.categories.join(" / ")
    : product.category;
  const statusMeta = STATUS_META[product.status] || STATUS_META.active;
  const canPurchase = product.status === "active" && product.stock > 0;
  const stockLabel =
    product.status === "coming_soon"
      ? "Not yet in stock"
      : product.status === "discontinued"
        ? "No longer available"
        : product.stock > 0
          ? `In Stock (${product.stock} left)`
          : "Out of Stock";
  const stockColorClass =
    product.status === "coming_soon"
      ? "bg-amber-500"
      : product.status === "discontinued"
        ? "bg-gray-400"
        : product.stock > 0
          ? "bg-green-500"
          : "bg-red-500";
  const stockTextClass =
    product.status === "coming_soon"
      ? "text-amber-700"
      : product.status === "discontinued"
        ? "text-gray-600"
        : product.stock > 0
          ? "text-green-700"
          : "text-red-600";

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <span>/</span>
          <Link to="/all-products" className="hover:text-brand-600">Shop</Link>
          <span>/</span>
          <Link to={`/all-products?category=${primaryCategory}`} className="hover:text-brand-600">
            {primaryCategory}
          </Link>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Product */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-10 grid md:grid-cols-2 gap-10 mb-12">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden">
              <img
                src={images[imgIndex]}
                alt={product.name}
                className="w-full h-full object-contain p-6"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      i === imgIndex ? "border-brand-500" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-brand-500 font-semibold uppercase tracking-wide">
                  {categoryLabel}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusMeta.badgeClass}`}>
                  {statusMeta.label}
                </span>
              </div>
              <h1 className="font-display font-bold text-3xl text-gray-900 mt-1 leading-snug">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            {product.rating != null && (
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? "fill-current" : "fill-gray-200 text-gray-200"}`} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {product.rating} ({product.reviewCount || 0} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-4xl text-gray-900">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-gray-400 text-xl line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-lg">
                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-gray-50 px-4 py-3 text-sm text-gray-600">
              <ReactMarkdown components={markdownComponents}>
                {product.description || ""}
              </ReactMarkdown>
            </div>

            {statusMeta.message && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${statusMeta.badgeClass}`}>
                {statusMeta.message}
              </div>
            )}

            {product.models?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Model</p>
                  <span className="text-xs text-gray-500">{selectedModel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        selectedModel === model
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stockColorClass}`} />
              <span className={`text-sm font-medium ${stockTextClass}`}>
                {stockLabel}
              </span>
            </div>

            {/* Qty + Add */}
            {canPurchase ? (
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-4 py-3 hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-3 font-semibold text-sm w-12 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    className="px-4 py-3 hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    added
                      ? "bg-green-500 text-white"
                      : "bg-brand-500 hover:bg-brand-600 text-white"
                  }`}
                >
                  {added ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      Added to Cart!
                    </span>
                  ) : (
                    "Add to Cart"
                  )}
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-gray-200 py-3.5 text-sm font-semibold text-gray-500"
                >
                  {product.status === "coming_soon"
                    ? "Coming Soon"
                    : product.status === "discontinued"
                      ? "Discontinued"
                      : "Out of Stock"}
                </button>
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <h2 className="font-display font-bold text-2xl text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
