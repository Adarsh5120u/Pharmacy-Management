# Pharmacy Management System - Backend Setup Guide

## Overview

The pharmacy management system now uses a **standalone Express.js backend with PostgreSQL** instead of Supabase. This provides complete control over the database and API.

## Architecture

```
Frontend (React/Vite)
    ↓
Express.js Backend (Node.js)
    ↓
PostgreSQL Database
```

## Prerequisites

- **Node.js** (v14 or later)
- **PostgreSQL** (v12 or later)
- **npm** or **yarn**

## Setup Instructions

### 1. Database Setup

#### Option A: Using psql (PostgreSQL CLI)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pharmacy_db;

# Connect to the new database
\c pharmacy_db

# Run schema from backend/schema.sql
\i backend/schema.sql

# Verify tables created
\dt
```

#### Option B: Using pgAdmin (GUI)

1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `pharmacy_db`
4. Click "Create"
5. Open Query Tool for the new database
6. Copy-paste contents of `backend/schema.sql`
7. Click Execute

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# Default values should work if you used the default PostgreSQL setup
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=pharmacy_db
# DB_USER=postgres
# DB_PASSWORD=postgres

# Start the backend server
npm run dev
# or for production: npm start
```

You should see:

```
✅ Database connected at [timestamp]
🚀 Pharmacy backend running on http://localhost:3001
```

### 3. Frontend Setup

```bash
# In the root directory (where src/ is located)
npm install

# Create or update .env file
# Already created with VITE_API_URL=http://localhost:3001/api

# Start the frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Base URL

```
http://localhost:3001/api
```

### Available Endpoints

#### Medicines

- `GET /medicines` - List all medicines
- `GET /medicines/:id` - Get single medicine
- `POST /medicines` - Create medicine
- `PUT /medicines/:id` - Update medicine
- `DELETE /medicines/:id` - Delete medicine

#### Inventory (Medicine Batches)

- `GET /inventory` - List all batches
- `POST /inventory` - Add new batch
- `PATCH /inventory/:id` - Update batch stock

#### Suppliers

- `GET /suppliers` - List all suppliers
- `GET /suppliers/:id` - Get supplier
- `POST /suppliers` - Create supplier
- `PUT /suppliers/:id` - Update supplier

#### Purchase Orders

- `GET /purchase-orders` - List all POs
- `POST /purchase-orders` - Create PO
- `PATCH /purchase-orders/:id/status` - Update PO status

#### Prescriptions

- `GET /prescriptions` - List all prescriptions
- `GET /prescriptions/:id` - Get prescription
- `POST /prescriptions` - Create prescription
- `PATCH /prescriptions/:id/status` - Update status

#### Sales

- `GET /sales` - List all sales
- `GET /sales/:id` - Get sale details
- `POST /sales` - Process sale

#### Dashboard

- `GET /dashboard/stats` - Get dashboard statistics

#### Health

- `GET /health` - Health check

## Database Schema

### Tables

1. **MEDICINE** - Medicine master data
2. **MEDICINE_BATCH** - Stock batches
3. **SUPPLIER** - Supplier information
4. **PURCHASE_ORDER** - Purchase orders
5. **PURCHASE_ORDER_ITEM** - PO line items
6. **PRESCRIPTION** - Patient prescriptions
7. **PRESCRIPTION_ITEM** - Prescription medicines
8. **PHARMACY_SALE** - Sales transactions
9. **PHARMACY_SALE_ITEM** - Sale line items

All with proper foreign key constraints and indexes for performance.

## Configuration

### Backend (.env)

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharmacy_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:3001/api
```

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running:

- **Windows:** Services → postgresql-x64
- **Mac:** `brew services start postgresql`
- **Linux:** `sudo systemctl start postgresql`

### Port Already in Use

If port 3001 is already in use:

1. Edit `backend/.env` and change PORT to another (e.g., 3002)
2. Update frontend `.env` with new URL

### CORS Errors

Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL (default is `http://localhost:5173`)

## Development Workflow

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

### Terminal 2: Start Frontend

```bash
npm run dev
```

Both servers will be running and communicating together.

## Production Deployment

### Backend

1. Build: Ensure `NODE_ENV=production`
2. Use a process manager like **PM2**:
   ```bash
   pm2 start server.js --name "pharmacy-api"
   ```

### Database

Use a managed PostgreSQL service or dedicated server with proper backups.

### Frontend

Build and deploy using Vercel, Netlify, or similar:

```bash
npm run build
```

## Migration from Supabase

The frontend API client (`src/app/utils/api.ts`) has been updated to use the new local backend. All existing components should work without modification.

## Support

For issues or questions about the setup:

1. Check logs in the terminal where the backend is running
2. Verify database connectivity using psql
3. Test API endpoints using curl or Postman

---

**Last Updated:** February 2026
**Status:** Production Ready
