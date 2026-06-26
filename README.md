# SimplePOS — Learning Project

A full-stack Point of Sale system built with **Django REST Framework** on the backend and **Vanilla JavaScript + Vite** on the frontend. This project is designed as a structured learning exercise covering the full lifecycle of a modern web application — from database models and REST APIs to frontend routing, JWT authentication, and real-time UI interactions.

---

## What We Are Learning

### The Big Picture

Most tutorials teach backend or frontend in isolation. This project deliberately connects both sides so you can see and feel exactly how a real production application works end-to-end. Every feature you build has a purpose: a cashier has to log in, scan products, process a payment, and print a receipt — and every one of those actions involves both a frontend decision and a backend response.

---

### Backend Concepts (Django + DRF)

**1. Django Project Structure**
Understanding how Django separates the project config (`pos_backend/`) from the application logic (`api/`) is the first mental model. The project is the container; the app is where the real code lives.

**2. Custom User Model**
Django's default `User` model works, but real applications need extra fields. Here we extend `AbstractUser` to add a `role` field (`admin` or `cashier`). The critical lesson: you must set `AUTH_USER_MODEL` before your first migration, or you face painful database reset situations.

**3. Models and Relationships**
The five models — `User`, `Category`, `Product`, `Order`, `OrderItem` — teach you:
- `ForeignKey` (Product → Category, Order → User, OrderItem → Order)
- `on_delete` strategies (`SET_NULL` vs `CASCADE`)
- Soft delete pattern (`is_active = False` instead of actual deletion)
- Storing computed values (`product_name` on `OrderItem`) to preserve history even if the product is later renamed or deleted

**4. Django REST Framework Serializers**
Serializers are the translation layer between Python objects and JSON. Key lessons:
- `read_only` vs `write_only` fields (never send `cost_price` to a cashier; never return `password` in a response)
- Nested serializers (a `Product` response embeds its `Category`)
- `source` argument to map `category_id` input → `category` FK field
- Overriding `create()` and `update()` for custom logic like hashing passwords

**5. ViewSets and URL Routing**
The `DefaultRouter` maps URL patterns automatically. You learn when to use `ModelViewSet` (full CRUD with minimal code) vs `ViewSet` (manual control when business logic is complex, like orders).

**6. JWT Authentication**
`djangorestframework-simplejwt` provides two tokens:
- **Access token** — short-lived (8 hours), sent on every request in `Authorization: Bearer <token>`
- **Refresh token** — long-lived (1 day), used only to get a new access token when the old one expires

This teaches the stateless authentication pattern that powers almost every modern API.

**7. CORS (Cross-Origin Resource Sharing)**
When your frontend on `localhost:5173` talks to your backend on `localhost:8000`, the browser blocks the request unless the backend explicitly allows it. `django-cors-headers` handles this. Understanding CORS errors is a rite of passage for every web developer.

**8. Database Transactions and Race Conditions**
The order creation flow uses `select_for_update()` inside a `transaction.atomic()` block. This is one of the most important patterns in backend development: when two cashiers ring up the last unit of stock simultaneously, only one should succeed. Without the transaction lock, both succeed and you have negative stock.

**9. Role-Based Access Control**
We check `request.user.role` inside views rather than using complex permission classes. This is intentional — it's simpler to read, and teaches you that permissions are just Python `if` statements at the end of the day.

**10. Aggregations and Reporting**
The dashboard uses Django ORM's `Sum`, `Count`, and `values().annotate()` to compute revenue, top products, and payment breakdowns — all in a single database query. This is the gateway to understanding SQL GROUP BY through the ORM.

---

### Frontend Concepts (Vanilla JS + Vite)

**1. Why Vanilla JS First**
Before reaching for React or Vue, writing a full application in plain JavaScript teaches you exactly what frameworks do for you. Every piece of state management, DOM update, and event binding you write manually is something a framework would abstract — and you'll appreciate that abstraction far more having done it by hand first.

**2. Vite as a Build Tool**
Vite gives you ES modules, hot module replacement, and a production build pipeline without complex configuration. The key lesson: modern JavaScript is written in modules (`import`/`export`) and browsers need a bundler to package them efficiently.

**3. Single Page Application (SPA) Routing**
There is no `<a href="/orders">` navigation in this app. Instead, `main.js` acts as a router — it holds the current page in a variable and calls a `render` function to swap the content. This is exactly what React Router does internally.

**4. JWT on the Frontend**
The `api.js` module stores tokens in `localStorage`, attaches them to every request via an `Authorization` header, and automatically attempts a token refresh when it receives a `401 Unauthorized` response. This interceptor pattern is what every production frontend uses.

**5. Component-Style Thinking Without a Framework**
Each page is a function (`renderLogin`, `renderPOS`, `renderDashboard`) that writes HTML into the DOM and then attaches event listeners. This is the manual version of what a React component does. You'll feel the pain points (re-rendering the whole table on every update) that React's virtual DOM solves.

**6. Modals and Overlay Management**
The payment modal, receipt modal, product editor, and confirm dialog are all built with the same pattern: inject a `.modal-overlay` div into the DOM, attach listeners, and remove the element on close. No library required.

**7. Optimistic Stock Updates**
After a successful sale, the product grid immediately reflects the new stock counts without a page reload. This teaches you to think about UI state vs server state — and how to keep them in sync.

**8. CSS Custom Properties (Variables)**
The entire design system lives in `:root` variables (`--accent`, `--border`, `--radius`, etc.). Change `--accent: #2563EB` to any colour and the whole app updates. This is the foundation of how design systems like Tailwind work under the hood.

**9. Separation of Concerns**
The frontend is split across purposeful files:
- `api.js` knows only how to talk to the backend
- `layout.js` knows only how to draw the sidebar
- `pages/*.js` know only how to render their own content
- `utils.js` knows only generic helpers
- `toast.js` knows only how to show notifications

This is the single responsibility principle in practice.

---

## Project Structure

```
SimplePOS/
│
├── pos_backend/                    ← Django project root
│   │
│   ├── manage.py                   ← Django CLI entry point
│   ├── seed.py                     ← Creates demo users and products
│   │
│   ├── pos_backend/                ← Project configuration package
│   │   ├── settings.py             ← Installed apps, DB, JWT, CORS config
│   │   ├── urls.py                 ← Root URL dispatcher → api/ routes
│   │   ├── wsgi.py                 ← Production WSGI server entry point
│   │   └── asgi.py                 ← Async server entry point (future use)
│   │
│   └── api/                        ← Single Django app (all business logic)
│       ├── models.py               ← User, Category, Product, Order, OrderItem
│       ├── serializers.py          ← JSON ↔ Python object translation layer
│       ├── views.py                ← All API endpoints (auth, CRUD, reports)
│       ├── admin.py                ← Django admin registration (extend as needed)
│       ├── apps.py                 ← App config
│       └── migrations/
│           └── 0001_initial.py     ← Auto-generated DB schema migration
│
└── pos_frontend/                   ← Vite vanilla JS project root
    │
    ├── index.html                  ← Single HTML file — Bootstrap Icons CDN,
    │                                  Google Fonts (DM Sans + DM Mono), #app div
    ├── package.json                ← Project metadata and scripts
    ├── vite.config.js              ← Build configuration
    │
    └── src/
        ├── main.js                 ← App entry point — boot logic and page router
        ├── main.css                ← ENTIRE design system: variables, layout,
        │                              components, utilities (no CSS framework)
        ├── api.js                  ← Fetch wrapper — JWT attach, auto-refresh,
        │                              token storage, all API methods
        ├── layout.js               ← Sidebar, topbar, nav rendering
        ├── toast.js                ← Slide-in notification system
        ├── utils.js                ← fmt.money(), fmt.date(), el(), confirm_modal()
        │
        └── pages/
            ├── login.js            ← Auth form — POST /auth/login/, token storage
            ├── dashboard.js        ← Stats, payment breakdown, top products,
            │                          low-stock alerts (admin only)
            ├── pos.js              ← Product grid, cart, payment modal, receipt
            │                          (core cashier workflow)
            ├── orders.js           ← Order history, date filter, detail modal,
            │                          void action (admin)
            ├── products.js         ← Product CRUD table, category manager,
            │                          stock badges (admin only)
            └── users.js            ← Staff management — add, edit, activate/
                                       deactivate, role assignment (admin only)
```

---

## API Endpoints Summary

| Method | Endpoint | Who | What |
|---|---|---|---|
| POST | `/api/v1/auth/login/` | Public | Get JWT tokens |
| POST | `/api/v1/auth/refresh/` | Public | Refresh access token |
| POST | `/api/v1/auth/logout/` | Auth | Invalidate refresh token |
| GET | `/api/v1/products/` | Auth | List products (search, filter) |
| POST | `/api/v1/products/` | Admin | Create product |
| PATCH | `/api/v1/products/{id}/` | Admin | Update product |
| DELETE | `/api/v1/products/{id}/` | Admin | Soft-delete product |
| GET | `/api/v1/categories/` | Auth | List categories |
| POST | `/api/v1/categories/` | Admin | Create category |
| DELETE | `/api/v1/categories/{id}/` | Admin | Delete category |
| POST | `/api/v1/orders/` | Auth | Create sale (atomic stock deduct) |
| GET | `/api/v1/orders/` | Auth | List orders (date/status filter) |
| GET | `/api/v1/orders/{id}/` | Auth | Single order detail |
| POST | `/api/v1/orders/{id}/void/` | Admin | Void order (restores stock) |
| GET | `/api/v1/reports/summary/` | Admin | Revenue, orders, payment breakdown |
| GET | `/api/v1/reports/low-stock/` | Admin | Products below threshold |
| GET | `/api/v1/users/` | Admin | List staff |
| POST | `/api/v1/users/` | Admin | Create staff user |
| PATCH | `/api/v1/users/{id}/` | Admin | Update staff user |

---

## Demo Credentials

| Username | Password | Role | Access |
|---|---|---|---|
| `admin` | `admin123` | Admin | Full access — all pages |
| `cashier` | `cashier123` | Cashier | New Sale + Orders only |

---

## Quick Start

### Backend

```bash
cd pos_backend

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers

# Set up database
python manage.py migrate

# Load demo data (users + 10 products)
python seed.py

# Start server on http://localhost:8000
python manage.py runserver
```

### Frontend

```bash
cd pos_frontend

# Install dependencies
npm install

# Start dev server on http://localhost:5173
npm run dev

# Build for production
npm run build
```

---

## Key Design Decisions and Why

**Single Django app (`api/`)** — Keeping all models, serializers, and views in one app makes the project easy to navigate for learners. In a larger production system you would split into `inventory/`, `sales/`, `users/`, etc.

**SQLite database** — Zero configuration, ships with Python, works perfectly for development and low-traffic production. The ORM code is identical whether you later switch to PostgreSQL.

**Vanilla JS instead of React** — Forces you to understand what the browser actually does. When you later learn React, you will know exactly which problems it is solving.

**No CSS framework (Bootstrap, Tailwind)** — Every style is written by hand using CSS custom properties. You learn the cascade, specificity, flexbox, and grid properly instead of memorising class names.

**`select_for_update()` in order creation** — Introduced deliberately to teach database locking. Most tutorials skip this and you only discover the bug in production when two people buy the last item simultaneously.

**Soft delete on products** — `is_active = False` instead of `DELETE FROM products`. This preserves order history: if you sold 50 units of a product last month, you want that record to remain even if you remove the product from your catalogue.

**`product_name` stored on `OrderItem`** — A product's name might change over time. Storing a snapshot of the name at the time of sale means historical receipts always show what the customer actually bought.

---

## Suggested Learning Path

1. **Read `models.py`** — Understand the five models and their relationships before touching anything else. Draw the entity-relationship diagram on paper.

2. **Read `serializers.py`** — Trace how a `Product` object becomes JSON and how a JSON request body becomes a `Product`. Pay attention to `read_only` and `write_only`.

3. **Trace one request end-to-end** — Log in as `cashier`, open the browser Network tab, click a product to add it to the cart, then click Charge. Watch every HTTP request: `POST /auth/login/`, `GET /products/`, `POST /orders/`. Find where each one is handled in `views.py`.

4. **Break something intentionally** — Remove the `select_for_update()` from the order creation view. Write a script that sends two simultaneous order requests for the last unit of stock. See what happens to the stock count.

5. **Add a feature** — Add a `discount` field to `OrderItem`. The cashier should be able to type a percentage discount per item. This requires changes to: the model, the migration, the serializer, the view calculation, the cart UI, and the receipt display. Following that chain teaches you how a real feature request flows through a full-stack application.

6. **Add tests** — Write a test in `api/tests.py` that creates an order with two items, checks the stock was reduced, then voids the order and checks the stock was restored. This teaches you Django's `TestCase` and the importance of testing business logic, not just endpoints.