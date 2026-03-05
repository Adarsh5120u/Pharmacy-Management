# Pharmacy Management System

Full-stack pharmacy management app with:
- `frontend/` (React + Vite)
- `backend/` (Express + PostgreSQL)

## Project Structure

```text
update2/
  frontend/
    src/
    utils/
    package.json
    vite.config.ts
  backend/
    server.js
    db.js
    schema.sql
    routes/
      index.js
    modules/
      dashboard/
      inventory/
      medicines/
      prescriptions/
      purchaseOrders/
      sales/
      suppliers/
    controllers/
    middleware/
```

## Current Features

- Dashboard stats and sales analytics
- Medicine master CRUD
- Inventory batch management
- Supplier management
- Purchase order creation and receiving flow
- Prescription management
- Sales and billing with invoice PDF generation
- Click any sale in sales list to download invoice
- Customer name stored in sale and shown in invoice
- Sales list toggle: recent/all
- Profile sales report PDF with:
  - From/To date range
  - Medicine-wise quantity section
  - Notification-bell download flow

## Setup

## Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configure `.env` and make sure PostgreSQL is running.

Run schema:

```bash
psql -U postgres -d pharmacy_db -f schema.sql
```

Start backend:

```bash
npm run dev
```

Backend runs at `http://localhost:3001`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Build

Frontend production build:

```bash
cd frontend
npm run build
```

## API Base

Frontend API base uses:
- `VITE_API_URL` if provided
- else default: `http://localhost:3001/api`

## Notes

- The backend is modularized by domain (`module -> service/controller/routes`).
- Route registration is centralized in `backend/routes/index.js`.
- Root `.gitignore` and `frontend/.gitignore` are configured for node/build artifacts.
