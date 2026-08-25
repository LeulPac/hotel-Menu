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

