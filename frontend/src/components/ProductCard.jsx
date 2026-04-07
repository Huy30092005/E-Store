import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useState } from "react";
import { Check, Star } from "lucide-react";

export default function ProductCard({ product }) {
  const { addToCart } = useApp();
  const [added, setAdded] = useState(false);
  const hasModels = Array.isArray(product.models) && product.models.length > 0;
  const categoryLabel = product.categories?.length
    ? product.categories.join(" • ")
    : product.category;

  const handleAdd = (e) => {
    if (hasModels) {
      return;
    }
    e.preventDefault();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link
      to={`/product/${product._id}`}
      className="product-card group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img
          src={product.image}
          alt={product.name}
          className="product-img w-full h-full object-cover transition-transform duration-500"
        />
        {product.discount > 0 && (
          <span className="absolute top-3 left-3 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{product.discount}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full font-medium">
              Out of Stock
            </span>
          </div>
        )}
        {/* Quick add overlay */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className={`w-full py-3 text-sm font-semibold transition-colors ${
              added
                ? "bg-green-500 text-white"
                : "bg-gray-900/90 hover:bg-brand-500 text-white"
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            {added ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Added to Cart
              </span>
            ) : product.stock === 0 ? (
              "Out of Stock"
            ) : hasModels ? (
              "Choose Model"
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-brand-500 font-medium uppercase tracking-wide mb-1">
          {categoryLabel}
        </p>
        <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {product.name}
        </h3>
        {hasModels && (
          <p className="mt-1 text-xs text-gray-500">
            {product.models.length} model{product.models.length !== 1 ? "s" : ""} available
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-gray-400 text-sm line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          {/* Stars */}
          {product.rating != null && (
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs text-gray-500">{product.rating}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
