# Pharmacy Backend API

Express.js + PostgreSQL backend for the pharmacy management system.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Server runs on `http://localhost:3001`

## Architecture

- **Framework:** Express.js
- **Database:** PostgreSQL
- **Port:** 3001 (configurable)
- **API:** REST with JSON payloads

## Project Structure

```
backend/
├── server.js              # Main Express application
├── db.js                  # PostgreSQL connection pool
├── schema.sql             # Database schema
├── package.json           # Dependencies
├── .env.example           # Environment template
└── routes/
    ├── medicines.js       # Medicine CRUD
    ├── inventory.js       # Batch management
    ├── suppliers.js       # Supplier CRUD
    ├── purchaseOrders.js  # PO management
    ├── prescriptions.js   # Prescription handling
    ├── sales.js           # Sale processing
    └── dashboard.js       # Dashboard stats
```

## Database Setup

### Create Database

```sql
CREATE DATABASE pharmacy_db;
```

### Run Schema

```bash
psql -U postgres -d pharmacy_db -f schema.sql
```

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pharmacy_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

All endpoints return JSON responses with `success` boolean and `data` payload.

### Request Example

```bash
curl -X GET http://localhost:3001/api/medicines \
  -H "Content-Type: application/json"
```

### Response Example

```json
{
  "success": true,
  "data": [
    {
      "medicine_id": 1,
      "name": "Amoxicillin",
      "category": "Antibiotic",
      "...": "..."
    }
  ]
}
```

## Key Features

✅ Complete inventory management
✅ Purchase order tracking
✅ Prescription handling
✅ Sales & billing
✅ Dashboard statistics
✅ CORS enabled for frontend
✅ Error handling
✅ PostgreSQL transactions for data consistency

## Scripts

```bash
npm start      # Production mode
npm run dev    # Development with nodemon
```

## Notes

- All sensitive endpoints should be protected with authentication (to be added)
- Database transactions ensure data consistency for multi-step operations
- Indexes on common query fields for performance
