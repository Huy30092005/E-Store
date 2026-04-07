import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const http = axios.create({
  baseURL: `${API_URL}/api`,
});

const TOKEN_KEY = "token";
const USER_KEY = "quickcart_user";

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.token = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const makeError = (message) => {
  const error = new Error(message);
  error.response = { data: { message } };
  return error;
};

const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearStoredUser = () => {
  localStorage.removeItem(USER_KEY);
};

const normalizeCategoryValue = (value = "") => {
  const normalized = String(value).trim().toLowerCase();
  const aliases = {
    laptops: "laptop",
    laptop: "laptop",
    pcs: "pc",
    pc: "pc",
    phones: "phone",
    phone: "phone",
    accessories: "accessory",
    accessory: "accessory",
    audio: "audio",
    gaming: "gaming",
    wearables: "wearable",
    wearable: "wearable",
    cameras: "camera",
    camera: "camera",
  };

  return aliases[normalized] || normalized;
};

const resolveSuccess = (response) => {
  if (response?.data?.success === false) {
    throw makeError(response.data.message || "Request failed.");
  }
  return response.data;
};

const normalizeProduct = (product = {}) => {
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : Array.isArray(product.image)
      ? product.image.filter(Boolean)
      : [product.image].filter(Boolean);

  const price = Number(product.price || 0);
  const originalPrice = Number(product.originalPrice || price);
  const stock = Number(product.stock ?? product.stockQuantity ?? 0);
  const rating = product.rating == null ? null : Number(product.rating);
  const reviewCount = Number(product.reviewCount || 0);
  const discount =
    Number(product.discount) ||
    (originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0);
  const categories = Array.isArray(product.category)
    ? product.category.filter(Boolean)
    : [product.category].filter(Boolean);

  return {
    ...product,
    status: product.status || "active",
    image: images[0] || "/favicon.svg",
    images,
    category: categories[0] || "",
    categories,
    models: Array.isArray(product.models) ? product.models.filter(Boolean) : [],
    price,
    originalPrice,
    stock,
    rating,
    reviewCount,
    discount,
  };
};

const normalizeCartItem = (item = {}) => ({
  ...item,
  product: normalizeProduct(item.product),
  quantity: Number(item.quantity || 0),
  model: item.model || "default",
});

const normalizeOrder = (order = {}) => ({
  ...order,
  createdAt: order.createdAt || order.date,
  totalAmount: Number(order.totalAmount ?? order.amount ?? 0),
  shippingAddress: order.shippingAddress || order.address || null,
  items: (order.items || []).map((item) => ({
    ...item,
    price: Number(item.price || item.product?.price || 0),
    quantity: Number(item.quantity || 0),
    product: item.product ? normalizeProduct(item.product) : item.product,
  })),
});

const ensureAuth = () => {
  if (!localStorage.getItem(TOKEN_KEY)) {
    throw makeError("Please sign in to continue.");
  }
};

async function fetchAllProductPages() {
  const firstResponse = await http.get("/product/list", {
    params: { page: 1, limit: 100 },
  });
  const firstData = resolveSuccess(firstResponse);
  const totalPages = firstData.pagination?.totalPages || 1;

  if (totalPages <= 1) {
    return firstData;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      http.get("/product/list", {
        params: { page: index + 2, limit: 100 },
      })
    )
  );

  const remainingProducts = remainingResponses.flatMap((response) => {
    const data = resolveSuccess(response);
    return data.products || [];
  });

  return {
    ...firstData,
    products: [...(firstData.products || []), ...remainingProducts],
  };
}

export async function register(payload) {
  const response = await http.post("/user/register", payload);
  const data = resolveSuccess(response);
  setStoredUser(data.user);
  return { data: { token: data.token, user: data.user } };
}

export async function login(payload) {
  const response = await http.post("/user/login", payload);
  const data = resolveSuccess(response);
  setStoredUser(data.user);
  return { data: { token: data.token, user: data.user } };
}

export async function getMe() {
  ensureAuth();
  const response = await http.get("/user/me");
  const data = resolveSuccess(response);
  setStoredUser(data.user);
  return { data: data.user };
}

export async function getProducts(params = {}) {
  const data = await fetchAllProductPages();
  let products = (data.products || []).map(normalizeProduct);
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = "newest",
    page = 1,
    limit,
  } = params;

  if (category) {
    const targetCategory = normalizeCategoryValue(category);
    products = products.filter((product) =>
      (product.categories || []).some(
        (productCategory) => normalizeCategoryValue(productCategory) === targetCategory
      )
    );
  }

  if (search) {
    const query = search.toLowerCase();
    products = products.filter(
      (product) =>
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  }

  if (minPrice !== "" && minPrice != null) {
    products = products.filter((product) => product.price >= Number(minPrice));
  }

  if (maxPrice !== "" && maxPrice != null) {
    products = products.filter((product) => product.price <= Number(maxPrice));
  }

  switch (sort) {
    case "price_asc":
      products.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      products.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "newest":
    default:
      products.sort((a, b) => (b.date || 0) - (a.date || 0));
      break;
  }

  const total = products.length;
  const normalizedLimit = Number(limit || total || 0);
  const start = (Number(page) - 1) * normalizedLimit;
  const paginated =
    normalizedLimit > 0 ? products.slice(start, start + normalizedLimit) : products;

  return { data: { products: paginated, total } };
}

export async function getFeatured() {
  const response = await getProducts({ sort: "newest", limit: 24 });
  const products = response.data.products
    .filter((product) => product.bestSeller)
    .slice(0, 9);
  return { data: products };
}

export async function getProduct(id) {
  const response = await http.post("/product/single", { productId: id });
  const data = resolveSuccess(response);
  if (!data.product) {
    throw makeError("Product not found.");
  }
  return { data: normalizeProduct(data.product) };
}

export async function getCart() {
  ensureAuth();
  const response = await http.get("/cart/user");
  const data = resolveSuccess(response);
  return { data: (data.items || []).map(normalizeCartItem) };
}

export async function addToCart(productId, quantity = 1, model = "default") {
  ensureAuth();
  for (let index = 0; index < quantity; index += 1) {
    const response = await http.post("/cart/add", {
      itemId: productId,
      models: model,
    });
    resolveSuccess(response);
  }

  return getCart();
}

export async function updateCartItem(productId, quantity, model = "default") {
  ensureAuth();
  const response = await http.post("/cart/update", {
    itemId: productId,
    models: model,
    quantity,
  });
  resolveSuccess(response);
  return getCart();
}

export async function removeFromCart(productId, model = "default") {
  ensureAuth();
  const response = await http.post("/cart/update", {
    itemId: productId,
    models: model,
    quantity: 0,
  });
  resolveSuccess(response);
  return getCart();
}

export async function clearCart(cart = []) {
  ensureAuth();
  await Promise.all(
    cart.map((item) =>
      http.post("/cart/update", {
        itemId: item.product._id,
        models: item.model || "default",
        quantity: 0,
      })
    )
  );
  return { data: [] };
}

const buildOrderItems = (items = []) =>
  items.map((item) => ({
    product: item.product,
    name: item.product.name,
    quantity: item.quantity,
    price: Number(item.product.price || 0),
    model: item.model || "default",
  }));

const computeOrderAmount = (items = []) =>
  items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

export async function createOrder(payload) {
  ensureAuth();
  const items = buildOrderItems(payload.items);
  const amount = computeOrderAmount(items);

  const response = await http.post("/order/place", {
    items,
    amount,
    address: payload.shippingAddress,
  });
  const data = resolveSuccess(response);
  const order = normalizeOrder(data.order || {});
  return { data: order };
}

export async function createStripeOrder(payload) {
  ensureAuth();
  const items = buildOrderItems(payload.items);
  const amount = computeOrderAmount(items);

  const response = await http.post("/order/stripe", {
    items,
    amount,
    address: payload.shippingAddress,
  });
  const data = resolveSuccess(response);
  return {
    data: {
      sessionUrl: data.session_url,
      order: normalizeOrder(data.order || {}),
    },
  };
}

export async function verifyStripeOrder(orderId, success) {
  ensureAuth();
  const response = await http.post("/order/verifyStripe", {
    orderId,
    success: success ? "true" : "false",
  });
  const data = response.data;
  return { data };
}

export async function getOrders() {
  ensureAuth();
  const response = await http.post("/order/userorders", {});
  const data = resolveSuccess(response);
  return { data: (data.orders || []).map(normalizeOrder) };
}

export async function getOrder(id) {
  ensureAuth();
  const response = await http.get(`/order/${id}`);
  const data = resolveSuccess(response);
  return { data: normalizeOrder(data.order || {}) };
}

export function logoutSession() {
  clearStoredUser();
  localStorage.removeItem(TOKEN_KEY);
}
