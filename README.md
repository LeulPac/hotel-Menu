# Hotel Menu - QR Ordering System

A premium, full-stack QR-based digital menu and ordering system for hotel restaurants.

## Features

**Customer Side (Mobile First)**
*   Scan QR code to immediately access the menu (no login required).
*   Browse categories (Starters, Main Course, Grills, Desserts, Drinks) with a clean, dynamic UI.
*   Add items to the cart, adjust quantities.
*   Required table number input before placing an order.
*   Instant order submission to the kitchen.

**Admin Dashboard (Protected)**
*   **Live Orders:** Real-time incoming orders via WebSockets. Visual and audio cues for new orders. Progress statuses (New → Preparing → Ready → Delivered).
*   **Menu Management:** Full CRUD capabilities for menu items, including image uploads and availability toggles.
*   **Analytics:** View Daily, Weekly, Monthly, and Yearly revenue. Includes top-selling items and table revenue breakdowns. Export reports to PDF.

## Tech Stack
*   **Frontend:** HTML5, CSS3 (Vanilla, CSS Variables, Flexbox/Grid), Vanilla JavaScript (ES6+).
*   **Backend:** Node.js, Express.js.
*   **Database:** MySQL.
*   **Real-time:** Socket.io.
*   **Authentication:** JWT (JSON Web Tokens).
*   **Utilities:** Multer (image uploads), PDFKit (report generation), Chart.js (analytics charts).

## Setup Instructions

### Prerequisites
*   Node.js (v16+)
*   MySQL Server (v8+)

### 1. Database Setup
1.  Log into your MySQL server.
2.  Run the provided initialization script to create the database, tables, and insert dummy data:
    ```bash
    mysql -u root -p < scripts/init-db.sql
    ```

### 2. Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env` and update your MySQL password and JWT secret:
    ```bash
    cp .env.example .env
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

### 3. Usage
*   **Customer Menu (QR Entry):** `http://localhost:4000/`
*   **Admin Dashboard:** `http://localhost:4000/admin/login.html`
    *   **Default Login:** `admin@hotel.com`
    *   **Default Password:** `admin123`
*   **Generate QR Code:** `http://localhost:4000/api/qr`

## Project Structure
*   `/backend` - Node/Express server, API routes, Socket.io, DB config.
*   `/frontend` - Static assets, HTML, CSS, JS served by Express.
*   `/scripts` - Database initialization script.
