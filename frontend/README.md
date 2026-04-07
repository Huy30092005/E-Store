
# QuickCart — React Frontend

A pixel-faithful clone of [QuickCart](https://quickcart.greatstack.in/) rebuilt with  **React 18 + Tailwind CSS** , designed to connect to your own  **Express REST API** .

No Next.js, no SSR — just a clean Create React App SPA.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your backend URL
cp .env.example .env.local
# Edit REACT_APP_API_URL=http://localhost:5000/api

# 3. Run dev server
npm start
```

---

## Project Structure

```
src/
├── services/
│   └── api.js          # All Axios calls — point at your Express backend
├── context/
│   └── AppContext.jsx  # Global state: auth, cart, user
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── CartSidebar.jsx
│   ├── ProductCard.jsx
│   └── ProtectedRoute.jsx
├── pages/
│   ├── HomePage.jsx        # Hero slider, categories, products, banner
│   ├── AllProductsPage.jsx # Filterable/sortable product grid + pagination
│   ├── ProductPage.jsx     # Product detail, image gallery, add-to-cart
│   ├── AuthPage.jsx        # Login / Register (tabbed)
│   ├── CheckoutPage.jsx    # Shipping + payment form → POST /api/orders
│   ├── OrdersPage.jsx      # Order list + order detail
│   ├── SellerDashboard.jsx # CRUD products + view orders (role: seller)
│   └── MiscPages.jsx       # About + Contact
└── App.jsx                 # React Router v6 routes
```

---

## Express API Contract

The frontend calls these endpoints. Implement them in your Express app:

### Auth

| Method | Path                   | Body / Response                                    |
| ------ | ---------------------- | -------------------------------------------------- |
| POST   | `/api/auth/login`    | `{ email, password }`→`{ user, token }`       |
| POST   | `/api/auth/register` | `{ name, email, password }`→`{ user, token }` |
| GET    | `/api/auth/me`       | Bearer token →`user`object                      |

### Products

| Method | Path                       | Notes                                                                                      |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/products`          | Query:`page, limit, sort, category, search, minPrice, maxPrice`→`{ products, total }` |
| GET    | `/api/products/featured` | Returns featured product array                                                             |
| GET    | `/api/products/:id`      | Single product                                                                             |

### Cart (optional server-side — context handles optimistic updates)

| Method | Path                     | Body                                |
| ------ | ------------------------ | ----------------------------------- |
| GET    | `/api/cart`            | Returns `[{ product, quantity }]` |
| POST   | `/api/cart`            | `{ productId, quantity }`         |
| PUT    | `/api/cart/:productId` | `{ quantity }`                    |
| DELETE | `/api/cart/:productId` |                                     |
| DELETE | `/api/cart`            | Clear all                           |

### Orders

| Method | Path                | Notes                                                        |
| ------ | ------------------- | ------------------------------------------------------------ |
| POST   | `/api/orders`     | `{ items, shippingAddress, paymentMethod }`→ order object |
| GET    | `/api/orders`     | User's orders                                                |
| GET    | `/api/orders/:id` | Single order                                                 |

### Seller (requires `role: "seller"` on JWT)

| Method | Path                         |  |
| ------ | ---------------------------- | - |
| GET    | `/api/seller/products`     |  |
| POST   | `/api/seller/products`     |  |
| PUT    | `/api/seller/products/:id` |  |
| DELETE | `/api/seller/products/:id` |  |
| GET    | `/api/seller/orders`       |  |

---

## Product Schema (expected shape)

```js
{
  _id: "string",
  name: "string",
  description: "string",
  price: 99.99,
  originalPrice: 129.99,   // optional — shows strikethrough
  image: "https://…",
  images: ["…", "…"],      // optional — product gallery
  category: "Audio",
  stock: 42,
  rating: 4.5,              // optional
  reviewCount: 128,         // optional
  discount: 20,             // optional — badge %
  tags: ["wireless"],       // optional
}
```

---

## Auth & JWT

The app stores the JWT in `localStorage` under the key `token` and attaches it as `Authorization: Bearer <token>` on every request via an Axios interceptor in `src/services/api.js`.

To mark a user as a seller, include `role: "seller"` in the JWT payload / user object returned from your backend. The Seller Dashboard route will only render for that role.

---

## Customisation Tips

* **API base URL** — change `REACT_APP_API_URL` in `.env.local`
* **Brand colour** — edit `brand` in `tailwind.config.js` (currently orange-500 `#f97316`)
* **Hero slides** — edit the `SLIDES` array in `HomePage.jsx`
* **Categories** — edit the `CATEGORIES` arrays in `HomePage.jsx` and `AllProductsPage.jsx`
* **Payment** — the checkout form POSTs to `/api/orders`; wire in Stripe/PayPal on your backend

---

## Build for Production

```bash
npm run build
# Outputs to /build — serve with Express static middleware or any CDN
```
