# Hotel Menu - QR Ordering System

A full-stack QR-based digital menu and ordering system for hotel restaurants.

## Features

**Customer Side (Mobile First)**
* Scan QR code to immediately access the menu (no login required).
* Browse categories (Starters, Main Course, Grills, Desserts, Drinks) with a clean, dynamic UI.
* Add items to the cart, adjust quantities.
* Required table number or customer delivery details before placing an order.
* Instant order submission to the kitchen.

**Admin Dashboard (Protected)**
* **Live Orders:** Real-time incoming orders via WebSockets with visual and audio cues. Progress statuses (New → Preparing → Ready → Delivered).
* **Menu Management:** Full CRUD capabilities for menu items with Cloudinary cloud image uploads and availability toggles.
* **Analytics:** View Daily, Weekly, Monthly, and Yearly revenue. Includes top-selling items and table revenue breakdowns. Export reports to PDF.

## Tech Stack
* **Frontend:** HTML5, CSS3 (Modern Vanilla Design Tokens & Flexbox/Grid), Vanilla JavaScript (ES6+).
* **Backend:** Node.js, Express.js.
* **Database:** PostgreSQL (Neon / Supabase / Postgres).
* **Image Storage:** Cloudinary (CDN-backed image optimization).
* **Real-time:** Socket.io (with auto-polling fallback).
* **Authentication:** JWT (JSON Web Tokens).
* **Utilities:** Multer, Multer-Storage-Cloudinary, PDFKit (report generation), Chart.js (analytics charts).

---

## Setup Instructions

### 1. Database Setup (Neon PostgreSQL)
1. Create a database on [Neon.tech](https://neon.tech) and copy your connection string (`DATABASE_URL`).
2. The server will **automatically initialize the schema and seed default menu items** on startup.
3. (Optional) You can also run [`scripts/init-postgres.sql`](file:///d:/projects/Hotel-Menu/scripts/init-postgres.sql) directly in your Neon SQL Editor.

### 2. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file with your **Neon Database URL**, **JWT Secret**, and **Cloudinary** credentials:
   ```env
   DATABASE_URL=postgresql://neondb_owner:password@ep-sample.region.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=your_secure_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Default Access
* **Customer Menu (QR Entry):** `http://localhost:4000/`
* **Admin Dashboard:** `http://localhost:4000/admin/login.html`
  * **Default Login:** `admin@hotel.com`
  * **Default Password:** `admin123`
* **Generate QR Code:** `http://localhost:4000/api/qr`

---

## Deploying to Vercel

1. Push your code to **GitHub**.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Add the following **Environment Variables** in the Vercel dashboard:
   * `DATABASE_URL`: *Your Neon PostgreSQL connection string*
   * `JWT_SECRET`: *Your JWT secret*
   * `CLOUDINARY_CLOUD_NAME`: *Your Cloudinary cloud name*
   * `CLOUDINARY_API_KEY`: *Your Cloudinary API key*
   * `CLOUDINARY_API_SECRET`: *Your Cloudinary API secret*
5. Click **Deploy**.
