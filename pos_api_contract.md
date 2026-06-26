# POS System — API Contract

**Version:** 1.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**Auth:** JWT (Bearer token in `Authorization` header)  
**Content-Type:** `application/json`

---

## Overview

Single Django application backend serving a React + Vite frontend. All endpoints are prefixed with `/api/v1/`. Authentication uses JWT tokens obtained via the `/auth/` endpoints.

### Standard Response Envelope

**Success**
```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `SERVER_ERROR` | 500 | Unexpected server failure |

---

## 1. Authentication

### POST `/auth/login/`
Authenticate a user and receive JWT tokens.

**Request**
```json
{
  "username": "cashier01",
  "password": "secret"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "access": "<jwt_access_token>",
    "refresh": "<jwt_refresh_token>",
    "user": {
      "id": 1,
      "username": "cashier01",
      "full_name": "Jane Doe",
      "role": "cashier"
    }
  }
}
```

---

### POST `/auth/refresh/`
Exchange a refresh token for a new access token.

**Request**
```json
{ "refresh": "<jwt_refresh_token>" }
```

**Response `200`**
```json
{
  "success": true,
  "data": { "access": "<new_jwt_access_token>" }
}
```

---

### POST `/auth/logout/`
Blacklist the refresh token.

**Request**
```json
{ "refresh": "<jwt_refresh_token>" }
```

**Response `204`** — No body.

---

## 2. Products

> **Roles:** `admin` can create/update/delete. `cashier` can read only.

### GET `/products/`
List all products. Supports filtering and search.

**Query params**

| Param | Type | Description |
|---|---|---|
| `search` | string | Filter by name or SKU |
| `category_id` | integer | Filter by category |
| `in_stock` | boolean | Only items with `stock > 0` |
| `page` | integer | Page number (default `1`) |
| `page_size` | integer | Items per page (default `20`, max `100`) |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "Bottled Water 500ml",
      "sku": "BW-500",
      "price": "50.00",
      "category": { "id": 2, "name": "Beverages" },
      "stock": 120,
      "image_url": "/media/products/bw500.jpg",
      "is_active": true
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 85,
    "total_pages": 5
  }
}
```

---

### GET `/products/{id}/`
Retrieve a single product.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "name": "Bottled Water 500ml",
    "sku": "BW-500",
    "price": "50.00",
    "cost_price": "30.00",
    "category": { "id": 2, "name": "Beverages" },
    "stock": 120,
    "low_stock_threshold": 10,
    "image_url": "/media/products/bw500.jpg",
    "is_active": true,
    "created_at": "2025-01-10T08:00:00Z",
    "updated_at": "2025-06-01T12:00:00Z"
  }
}
```

---

### POST `/products/` _(admin only)_
Create a new product.

**Request**
```json
{
  "name": "Bottled Water 500ml",
  "sku": "BW-500",
  "price": "50.00",
  "cost_price": "30.00",
  "category_id": 2,
  "stock": 120,
  "low_stock_threshold": 10,
  "is_active": true
}
```

**Response `201`** — Returns the created product object.

---

### PATCH `/products/{id}/` _(admin only)_
Update product fields (partial update).

**Request** — any subset of product fields.

**Response `200`** — Returns the updated product object.

---

### DELETE `/products/{id}/` _(admin only)_
Soft-delete a product (`is_active = false`).

**Response `204`** — No body.

---

## 3. Categories

### GET `/categories/`
List all categories.

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Food" },
    { "id": 2, "name": "Beverages" }
  ]
}
```

---

### POST `/categories/` _(admin only)_
```json
{ "name": "Snacks" }
```
**Response `201`** — Returns the created category object.

---

### PATCH `/categories/{id}/` _(admin only)_
**Response `200`** — Returns the updated category object.

---

### DELETE `/categories/{id}/` _(admin only)_
**Response `204`** — No body.

---

## 4. Orders (Sales)

### POST `/orders/`
Create a new order (sale). Decrements stock atomically.

**Request**
```json
{
  "items": [
    { "product_id": 10, "quantity": 2 },
    { "product_id": 5,  "quantity": 1 }
  ],
  "payment_method": "cash",
  "amount_tendered": "200.00",
  "customer_name": "John",
  "note": "No bag"
}
```

`payment_method` enum: `cash` | `mpesa` | `card`

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": 301,
    "order_number": "ORD-20260626-0301",
    "cashier": { "id": 1, "full_name": "Jane Doe" },
    "items": [
      {
        "product_id": 10,
        "product_name": "Bottled Water 500ml",
        "quantity": 2,
        "unit_price": "50.00",
        "subtotal": "100.00"
      },
      {
        "product_id": 5,
        "product_name": "Bread Loaf",
        "quantity": 1,
        "unit_price": "70.00",
        "subtotal": "70.00"
      }
    ],
    "subtotal": "170.00",
    "tax": "27.20",
    "total": "197.20",
    "payment_method": "cash",
    "amount_tendered": "200.00",
    "change": "2.80",
    "status": "completed",
    "created_at": "2026-06-26T10:15:00Z"
  }
}
```

**Possible errors:**

| Scenario | Code | Status |
|---|---|---|
| Product not found | `NOT_FOUND` | 404 |
| Insufficient stock | `CONFLICT` | 409 |
| Invalid payment method | `VALIDATION_ERROR` | 422 |

---

### GET `/orders/`
List orders. Supports date filtering.

**Query params**

| Param | Type | Description |
|---|---|---|
| `date` | `YYYY-MM-DD` | Filter by exact date |
| `date_from` | `YYYY-MM-DD` | Range start |
| `date_to` | `YYYY-MM-DD` | Range end |
| `status` | string | `completed` \| `voided` |
| `cashier_id` | integer | Filter by cashier |
| `page` | integer | Page number |
| `page_size` | integer | Default `20` |

**Response `200`** — Paginated list of order summaries (same envelope as products list).

---

### GET `/orders/{id}/`
Retrieve a single order with full detail.

**Response `200`** — Returns the full order object as shown in the POST response.

---

### POST `/orders/{id}/void/` _(admin only)_
Void a completed order. Restores stock.

**Request**
```json
{ "reason": "Customer changed mind" }
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": 301,
    "status": "voided",
    "voided_at": "2026-06-26T11:00:00Z",
    "voided_by": { "id": 2, "full_name": "Admin User" },
    "void_reason": "Customer changed mind"
  }
}
```

---

## 5. Reports

> **Role:** `admin` only.

### GET `/reports/summary/`
Daily or range summary: revenue, order count, top products.

**Query params:** `date`, `date_from`, `date_to`

**Response `200`**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-06-26", "to": "2026-06-26" },
    "total_orders": 47,
    "total_revenue": "23450.00",
    "total_tax": "3752.00",
    "voided_orders": 2,
    "voided_revenue": "340.00",
    "net_revenue": "23110.00",
    "payment_breakdown": {
      "cash": "15000.00",
      "mpesa": "7450.00",
      "card": "1000.00"
    },
    "top_products": [
      { "product_id": 10, "name": "Bottled Water 500ml", "quantity_sold": 90, "revenue": "4500.00" },
      { "product_id": 5,  "name": "Bread Loaf",          "quantity_sold": 60, "revenue": "4200.00" }
    ]
  }
}
```

---

### GET `/reports/low-stock/`
Products at or below their `low_stock_threshold`.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "name": "Sugar 1kg",
      "sku": "SG-001",
      "stock": 3,
      "low_stock_threshold": 10
    }
  ]
}
```

---

## 6. Users _(admin only)_

### GET `/users/`
List staff users.

**Response `200`** — Paginated list of user objects.

---

### POST `/users/`
Create a new staff user.

**Request**
```json
{
  "username": "cashier02",
  "full_name": "Mark Osei",
  "password": "StrongPass123!",
  "role": "cashier"
}
```

`role` enum: `admin` | `cashier`

**Response `201`** — Returns user object (no password).

---

### PATCH `/users/{id}/`
Update user info or role.

**Response `200`** — Returns updated user object.

---

### POST `/users/{id}/change-password/`
Force-reset another user's password (admin) or self-change.

**Request**
```json
{
  "current_password": "oldpass",
  "new_password": "NewPass456!"
}
```

**Response `200`**
```json
{ "success": true, "data": { "message": "Password updated." } }
```

---

### DELETE `/users/{id}/`
Deactivate a user (`is_active = false`).

**Response `204`** — No body.

---

## Django URL Configuration (Reference)

```python
# urls.py (project level)
from django.urls import path, include

urlpatterns = [
    path("api/v1/auth/",       include("apps.auth.urls")),
    path("api/v1/products/",   include("apps.inventory.urls")),
    path("api/v1/categories/", include("apps.inventory.category_urls")),
    path("api/v1/orders/",     include("apps.sales.urls")),
    path("api/v1/reports/",    include("apps.reports.urls")),
    path("api/v1/users/",      include("apps.users.urls")),
]
```

---

## React / Vite — Base Client (Reference)

```typescript
// src/lib/apiClient.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Attempt token refresh
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        const { data } = await api.post("/auth/refresh/", { refresh });
        localStorage.setItem("access_token", data.data.access);
        return api.request(err.config);
      }
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Notes

- **Decimal fields** (`price`, `total`, etc.) are returned as strings to avoid floating-point rounding errors. Parse with a decimal library on the frontend.
- **Tax** is computed server-side. Store the tax rate in Django settings (`POS_TAX_RATE = 0.16`).
- **Stock decrement** on order creation must be wrapped in a `select_for_update()` transaction in Django to prevent race conditions.
- **Pagination** always uses `page` + `page_size` query params; the `meta` block contains `total` and `total_pages`.
- **Images** are served from `/media/` via Django's `MEDIA_URL`. In production, offload to S3 or equivalent.
- **CORS** — configure `django-cors-headers` to allow `http://localhost:5173` (Vite dev server).
