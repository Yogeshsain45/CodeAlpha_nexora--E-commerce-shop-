# NEXORA — Full-stack e-commerce starter

A full-stack e-commerce project using HTML, CSS, vanilla JavaScript, Node.js, Express, MongoDB and Mongoose. Includes product browsing/search/filter/sort, secure session login, persisted cart, wishlist, Cash on Delivery order placement, customer order history, admin product/order management, and seed data.

## Requirements

- Node.js 18+ (20 LTS recommended)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- npm

## Quick start (Windows PowerShell)

```powershell
# 1. Extract the ZIP and open its folder
cd nexora-ecommerce

# 2. Install dependencies
npm install

# 3. Create local environment config
Copy-Item .env.example .env
```

Open `.env` and set `MONGODB_URI`, a long unique `SESSION_SECRET`, and a strong `ADMIN_PASSWORD` (at least 12 characters; change the example). Keep `.env` private.

```powershell
# 4. Ensure MongoDB is running, then seed products
npm run seed

# 5. Create or update the admin account from .env
npm run create-admin

# 6. Start development server
npm run dev
```

Open **http://localhost:5000**. Production-style start: `npm start`.

### macOS/Linux commands

```bash
cp .env.example .env
npm install
npm run seed
npm run create-admin
npm run dev
```

## MongoDB

Local default:
`mongodb://127.0.0.1:27017/nexora`

Or create a database user in MongoDB Atlas, allow only appropriate network access, and set `MONGODB_URI` to the Atlas connection string. If your Atlas password contains reserved URL characters, URL-encode them.

**Important:** order creation uses MongoDB transactions to reduce stock safely. A standalone local MongoDB server may not support transactions. Use a replica set (including a single-node replica set) or Atlas for checkout transaction support. If transactions are unsupported, checkout fails rather than silently risking stock inconsistencies.

## Admin

Configure these in `.env` before running `npm run create-admin`:
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (strong, unique, at least 12 characters)

Sign in with that account and open the account menu → Store dashboard. Admin routes enforce role authorization on the server.

## Features included

- Responsive storefront with featured items, categories and product cards
- Product listing with search, category, price ceiling, sorting and pagination
- Product detail drawer and related products
- Registration/login/logout with bcrypt and HttpOnly session cookie
- Session store backed by MongoDB when configured
- Persistent authenticated cart with quantity and stock checks
- Persistent wishlist
- Checkout with address validation and Cash on Delivery
- Server-calculated order totals and shipping
- MongoDB transaction for order creation and stock decrement
- User-only order history and eligible order cancellation
- Admin dashboard, product create/edit/archive, order status updates, customer list
- Seed script with 20 demo products
- Security headers, request-size limit, auth rate limiting, environment configuration

## Deliberate configuration limitations

This starter does **not** claim to provide these integrations out of the box:
- Online card/UPI payment: only COD is enabled. Razorpay/Stripe must be separately configured and payment signatures/webhooks implemented before offering online payment.
- Password reset: secure email delivery is not configured; endpoints return a setup-required response.
- Newsletter and contact email delivery: UI validation exists, but an email provider must be connected.
- Product review submission, coupon engine, invoice PDF generation and image file uploads are not implemented.
- Demo product images load from Unsplash URLs and require internet access; replace with owned/local assets for production.

## API overview

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Products: `/api/products`, `/api/products/featured`, `/api/products/:id`, `/api/categories`
- Cart (authenticated): `/api/cart`, `/api/cart/items`
- Wishlist (authenticated): `/api/wishlist`
- Orders (authenticated): `/api/orders`, `/api/orders/my`, `/api/orders/:id`, `/api/orders/:id/cancel`
- User (authenticated): `/api/users/me`, `/api/users/me/password`
- Admin: `/api/admin/dashboard`, `/api/admin/products`, `/api/admin/orders`, `/api/admin/customers`

## Test and troubleshooting

```bash
npm test
```

Automated integration tests are not yet included; the command is a placeholder for Node's test runner and will report zero tests until tests are added. Use the manual checklist below.

### Manual smoke test
1. Register a normal account.
2. Browse/search/filter the seeded products.
3. Add an item to the bag and change quantity.
4. Refresh the page and verify cart persistence.
5. Checkout with a valid Indian shipping address using COD.
6. Verify order appears in My Orders and stock decreases.
7. Cancel a pending/confirmed order and verify stock is restored.
8. Sign in as admin and update an order status.
9. Try `/api/admin/dashboard` as a normal user and verify it returns 403.

### Troubleshooting
- `MONGODB_URI is missing`: copy `.env.example` to `.env`.
- Connection refused: start MongoDB or check the Atlas URI/network allowlist.
- Checkout transaction error: use Atlas or configure local MongoDB as a replica set.
- Empty product grid: run `npm run seed`, then reload.
- Admin menu missing: create the admin account and sign in again.
- Port busy: set another `PORT` in `.env`.

## Before production

Set `NODE_ENV=production`, use HTTPS, set `COOKIE_SECURE=true`, use a strong `SESSION_SECRET`, restrict the Atlas network allowlist, configure CSRF protection for your deployment model, add automated tests, connect real payment/email services, and complete a security review. Do not use demo credentials or demo images in a live store.
