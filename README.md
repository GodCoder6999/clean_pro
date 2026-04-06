# 🧹 CleanerPro — Home Cleaning Services Platform

A full-stack home cleaning services booking platform with role-based access control, built with **Node.js**, **Express**, **SQLite**, and vanilla **HTML/CSS/JS**.

![CleanerPro](https://img.shields.io/badge/CleanerPro-Home%20Services-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat-square&logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-blue?style=flat-square&logo=sqlite)

## ✨ Features

### 👤 Role-Based Access Control
- **Customers** — Browse services, find nearby workers, book services, manage bookings, process payments, submit reviews
- **Workers** — Toggle availability, accept/reject job requests, update job status (start/complete)
- **Admins** — Platform overview with stats, approve worker registrations, suspend/activate users, monitor all bookings

### 📋 Booking Lifecycle
`PENDING → ACCEPTED → IN_PROGRESS → COMPLETED` (with `REJECTED` and `CANCELLED` paths)

### 🔔 Notifications
Real-time notification bell with unread count, mark as read, and auto-generated updates on booking state changes.

### 🎨 Premium UI
Dark glassmorphism design with gradient accents, micro-animations, and responsive layout.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/cleaner_pro.git
cd cleaner_pro

# Install dependencies
npm install

# Start the server
npm start
```

The app will be running at **http://localhost:3000**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `alice@email.com` | `password123` |
| Customer | `robert@email.com` | `password123` |
| Customer | `jessica@email.com` | `password123` |
| Worker | `marcus@cleanerpro.com` | `password123` |
| Worker | `sarah@cleanerpro.com` | `password123` |
| Worker | `david@cleanerpro.com` | `password123` |
| Admin | `admin@cleanerpro.com` | `password123` |

---

## 📁 Project Structure

```
cleaner_pro/
├── server.js          # Express server with all API routes
├── database.js        # SQLite schema, seed data
├── package.json       # Dependencies & scripts
├── .gitignore
├── README.md
└── public/
    ├── index.html     # SPA shell
    ├── style.css      # Dark glassmorphism design system
    ├── api.js         # API client (fetch wrapper)
    ├── components.js  # Reusable UI components
    └── app.js         # Main app logic, router, pages
```

## 🛠️ Tech Stack

| Layer       | Technology            |
|-------------|----------------------|
| Backend     | Node.js + Express    |
| Database    | SQLite (better-sqlite3) |
| Auth        | JWT + bcrypt         |
| Frontend    | Vanilla HTML/CSS/JS  |
| Design      | Dark Glassmorphism   |

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### Services
- `GET /api/services` — List all services
- `POST /api/services` — Create service (admin)

### Workers
- `GET /api/workers/nearby?lat=&lng=&radius=` — Find nearby workers
- `PUT /api/workers/availability` — Toggle availability
- `GET /api/workers/:id` — Get worker profile

### Bookings
- `POST /api/bookings` — Create booking
- `GET /api/bookings` — Get user bookings
- `PUT /api/bookings/:id/status` — Update booking status

### Payments & Reviews
- `POST /api/payments` — Process payment
- `POST /api/reviews` — Submit review

### Notifications
- `GET /api/notifications` — Get notifications
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all read

### Admin
- `GET /api/admin/stats` — Platform statistics
- `GET /api/admin/users` — List users
- `PUT /api/admin/users/:id/status` — Update user status
- `GET /api/admin/bookings` — All bookings

## 📄 License

MIT
