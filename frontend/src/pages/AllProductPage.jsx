import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
];

const CATEGORIES = ["All", "Audio", "Gaming", "Laptops", "Phones", "Wearables", "Cameras", "Accessories", "PC"];

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

export default function AllProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const category = searchParams.get("category") || "All";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1");
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const limit = parseInt(searchParams.get("limit") || "12");

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value && value !== "All") p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    setSearchParams(p);
  };

  useEffect(() => {
    setLoading(true);
    const params = {
      limit,
      page,
      sort,
      ...(category !== "All" && { category }),
      ...(search && { search }),
      ...(minPrice && { minPrice }),
      ...(maxPrice && { maxPrice }),
    };
    getProducts(params)
      .then((res) => {
        setProducts(res.data?.products || res.data || []);
        setTotal(res.data?.total || 0);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, search, sort, page, minPrice, maxPrice, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="pt-[72px] min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-gray-900">
              {search ? `Results for "${search}"` : category !== "All" ? category : "All Products"}
            </h1>
            {!loading && (
              <p className="text-gray-500 text-sm mt-1">{total} product{total !== 1 ? "s" : ""} found</p>
            )}
          </div>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="md:hidden flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar Filters ──── */}
          <aside className={`w-60 flex-shrink-0 space-y-6 ${filterOpen ? "block" : "hidden"} md:block`}>
            {/* Category */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Category</h3>
              <ul className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      onClick={() => setParam("category", cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        category === cat
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Price Range</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setParam("minPrice", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setParam("maxPrice", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Sort By</h3>
              <ul className="space-y-1">
                {SORT_OPTIONS.map((s) => (
                  <li key={s.value}>
                    <button
                      onClick={() => setParam("sort", s.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        sort === s.value
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Product Grid ──── */}
          <div className="flex-1 min-w-0">
            {/* Active filters bar */}
            {(category !== "All" || search || minPrice || maxPrice) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {category !== "All" && (
                  <span className="bg-brand-100 text-brand-700 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    {category}
                    <button onClick={() => setParam("category", "All")} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {search && (
                  <span className="bg-brand-100 text-brand-700 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    "{search}"
                    <button onClick={() => setParam("search", "")} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading
                ? Array.from({ length: limit }).map((_, i) => <Skeleton key={i} />)
                : products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>

            {!loading && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-12 h-12 mb-4 text-gray-400" />
                <h3 className="text-gray-800 font-semibold mb-1">No products found</h3>
                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                  <label htmlFor="products-per-page" className="font-medium text-gray-700">
                    Products per page
                  </label>
                  <select
                    id="products-per-page"
                    value={limit}
                    onChange={(event) => setParam("limit", event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition-colors hover:border-brand-300 focus:border-brand-400"
                  >
                    {[8, 12, 16, 24].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setParam("page", String(page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:border-brand-400 hover:text-brand-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setParam("page", String(p))}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 hover:border-brand-400 hover:text-brand-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setParam("page", String(page + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-40 hover:border-brand-400 hover:text-brand-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
