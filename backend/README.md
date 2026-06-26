# Goldy Mobiles — Backend API

Node.js + Express + MongoDB backend for the Goldy Mobiles electronics shop app with role-based access control (customer, staff, admin).

## Features

- **Email OTP** authentication with JWT sessions (30-day expiry)
- **Role-based access control** with fine-grained permissions (`canViewCostPrice`, `canEditPrice`, `canViewReports`, `canManageStaff`)
- **Product catalog** (public) with search, filter, and pagination
- **Inventory management** with atomic stock movements via Mongoose transactions
- **Billing/invoicing** with GST breakdown and multiple payment modes
- **Quotation** lifecycle (draft → sent → converted → expired)
- **Expense tracking** with category-based summaries
- **Reports**: sales, low-stock, top products, profit/loss with CSV and PDF export
- **S3 presigned uploads** for product images (direct-to-S3, no proxy)
- **Expo push notifications** for low-stock alerts
- **PDF generation** for invoices via `pdfkit`
- **Barcode** support with nanoid-based internal code generation

## Prerequisites

- Node.js 18+
- MongoDB 6+ (replica set required for transactions — use `mongosh` to run `rs.initiate()` on a local instance)
- AWS S3 bucket configured for CORS
- Gmail account or SMTP server for sending OTP emails
- (Optional) Expo account for push notifications

## Setup

1. **Clone and install:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Required environment variables:**

   | Variable | Description |
   |---|---|
   | `MONGO_URI` | MongoDB connection string (must be a replica set for transactions) |
   | `JWT_SECRET` | Secret key for signing JWTs |
   | `JWT_EXPIRY` | Token expiry duration (default: `30d`) |
   | `SMTP_EMAIL` | Email address for sending OTPs |
   | `SMTP_PASSWORD` | App password for the SMTP email |
   | `AWS_ACCESS_KEY_ID` | AWS IAM access key |
   | `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
   | `AWS_REGION` | AWS region (e.g. `ap-south-1`) |
   | `S3_BUCKET_NAME` | S3 bucket name for product images |
   | `PORT` | Server port (default: `5000`) |
   | `EXPO_ACCESS_TOKEN` | Expo push notification access token |

4. **Start the server:**
   ```bash
   # Development (with auto-reload)
   npm run dev

   # Production
   npm start
   ```

## API Routes

### Public (no auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/catalog/products` | Browse products (search, filter, paginate) |
| `GET` | `/api/catalog/products/:id` | Product detail |
| `GET` | `/api/catalog/categories` | List categories |
| `POST` | `/api/inquiries` | Submit product inquiry (guest-friendly) |
| `GET` | `/api/health` | Health check |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/send-otp` | Send verification code to email |
| `POST` | `/api/auth/verify-otp` | Verify code and login/register |
| `GET` | `/api/auth/me` | Get current user profile |
| `PATCH` | `/api/auth/push-token` | Update Expo push token |

### Products (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Create product |
| `GET` | `/api/products/:id` | Get product |
| `PATCH` | `/api/products/:id` | Update product |
| `DELETE` | `/api/products/:id` | Soft-delete product |
| `GET` | `/api/products/barcode/:code` | Lookup by barcode |
| `POST` | `/api/products/:id/generate-barcode` | Generate internal barcode |

### Stock (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stock/movement` | Create stock movement |
| `GET` | `/api/stock/movements/:productId` | List movements for product |

### Billing (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/billing/invoices` | Create invoice (transactional) |
| `GET` | `/api/billing/invoices` | List invoices |
| `GET` | `/api/billing/invoices/:id` | Get invoice |
| `GET` | `/api/billing/invoices/:id/pdf` | Download invoice PDF |

### Customers (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/customers` | List customers |
| `POST` | `/api/customers` | Create customer |
| `GET` | `/api/customers/:id` | Get customer |

### Expenses (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | List expenses |
| `POST` | `/api/expenses` | Create expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |
| `GET` | `/api/expenses/summary` | Summary by category |

### Quotations (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quotations` | List quotations |
| `POST` | `/api/quotations` | Create quotation |
| `GET` | `/api/quotations/:id` | Get quotation |
| `PATCH` | `/api/quotations/:id` | Update quotation |
| `POST` | `/api/quotations/:id/convert` | Convert to invoice |

### Reports (admin / canViewReports)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/sales` | Sales summary |
| `GET` | `/api/reports/sales/export` | Export CSV or PDF |
| `GET` | `/api/reports/low-stock` | Low stock products |
| `GET` | `/api/reports/top-products` | Top selling products |
| `GET` | `/api/reports/profit-loss` | Profit/loss report |

### Users/Staff (admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/staff` | List staff/admin users |
| `PATCH` | `/api/users/:id/role` | Change role + permissions |
| `PATCH` | `/api/users/:id/deactivate` | Deactivate user |

### Uploads (staff/admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/uploads/presign` | Get presigned S3 upload URL |

## Barcode Workflow

In the backend, the barcode system is designed to streamline inventory and billing, acting exactly like a supermarket POS system.

### 1. Adding a Product (Inventory)
When adding a new product to inventory, there are two cases:
*   **Product has a manufacturer barcode** (e.g., a sealed iPhone box): Staff opens the Add Product screen, taps "Scan barcode" → camera opens → points at the box → barcode number (e.g. 894536201044) auto-fills the field. No manual typing needed, eliminating human error.
*   **Product has NO barcode** (e.g., loose accessories, local items, second-hand phones): Staff taps "Auto-generate". The backend (`POST /api/products/:id/generate-barcode`) creates an internal code (e.g., `EL-0041`) and stores it on the product in MongoDB. This code can be printed as a sticker and pasted on the product or shelf.

### 2. Billing / New Sale (Most Important Use)
This is the biggest time-saver — exactly how supermarket billing works:
*   Staff opens the Billing screen and points the camera at the item.
*   The system scans the code and calls `GET /api/products/barcode/:code`.
*   The product is instantly found and added to the customer's cart without any manual searching.

## Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "totalPages": 5, "limit": 20 }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ { "field": "email", "message": "..." } ]
}
```

## Important Notes

- **Transactions**: Invoice creation and stock movements use Mongoose sessions for atomicity. MongoDB must be running as a **replica set**.
- **costPrice**: Never exposed on public `/api/catalog/*` endpoints. On staff endpoints, only shown if the user has `canViewCostPrice` permission.
- **Soft deletes**: Products are soft-deleted (set `isActive: false`), not permanently removed.

## License

ISC
