# 🏥 Pharmacy Management System - Complete Guide

A comprehensive, modern pharmacy management system built with React, Tailwind CSS, and Supabase backend.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [How to Use Each Module](#how-to-use-each-module)
4. [Backend Architecture](#backend-architecture)
5. [Testing the System](#testing-the-system)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Access the Application
Your application is already running in Figma Make! Simply view the preview to see your pharmacy system.

### Step 2: Automatic Initialization
When you first load the application, it will **automatically initialize** with sample data including:
- 5 sample medicines (Amoxicillin, Ibuprofen, Paracetamol, Metformin, Lisinopril)
- 5 inventory batches with different stock levels and expiry dates
- This happens once when the app first loads

### Step 3: Start Using the System
The sidebar navigation allows you to access all 6 modules:
- **Dashboard** - Overview with KPIs and alerts
- **Medicine Master** - Manage medicine catalog
- **Inventory** - Batch-wise stock tracking
- **Purchase Orders** - Order from suppliers
- **Prescriptions** - Fulfill patient prescriptions
- **Sales & Billing** - POS-style checkout

---

## 📊 System Overview

### Six Main Modules

1. **Dashboard**
   - Real-time KPI cards (Low Stock, Expiring Medicines, Daily Sales, Pending Prescriptions)
   - Auto-refreshes every 30 seconds
   - Visual alerts for critical items
   - Sales trends and category breakdown charts

2. **Medicine Master**
   - Complete medicine catalog
   - Add, edit, and manage medicines
   - Track: Name, Generic Name, Category, Manufacturer, Strength, Form, Price, Status
   - Search and filter capabilities

3. **Inventory Management**
   - Batch-wise stock tracking
   - Expiry date monitoring with color-coded alerts
   - Low stock warnings
   - Location tracking (shelf positions)
   - Total inventory value calculation

4. **Purchase Orders**
   - Create orders to suppliers
   - Track order status (Pending, Approved, Received, Cancelled)
   - Multi-item orders
   - Automatic stock updates when received

5. **Prescription Fulfillment**
   - Process patient prescriptions
   - Auto-deduct stock when fulfilled
   - Track doctor information
   - Status management (Pending, Fulfilled, Cancelled)

6. **Sales & Billing**
   - POS-style interface
   - Quick medicine search and add to cart
   - Real-time total calculation
   - Automatic inventory deduction on sale

---

## 📖 How to Use Each Module

### 🏠 DASHBOARD

**What you'll see:**
- 4 KPI cards at the top showing key metrics
- Low Stock Alerts list (items below reorder level)
- Expiring Medicines list (items expiring within 30 days)
- Sales trend chart (6-month view)
- Category breakdown pie chart

**How to use:**
1. Simply navigate to Dashboard (it's the default screen)
2. Check the KPI numbers for quick insights
3. Review alerts for items needing attention
4. The dashboard refreshes automatically every 30 seconds

**What the numbers mean:**
- **Low Stock Alerts**: Items where current stock < reorder level
- **Expiring Soon**: Items expiring within 30 days
- **Today's Sales**: Total $ amount of sales made today
- **Pending Prescriptions**: Number of prescriptions waiting to be fulfilled

---

### 💊 MEDICINE MASTER

**Adding a New Medicine:**

1. Click the **"Add Medicine"** button (top right)
2. Fill in the form:
   - **Medicine Name**: Brand name (e.g., "Tylenol")
   - **Generic Name**: Chemical name (e.g., "Acetaminophen")
   - **Category**: Select from dropdown (Antibiotics, Pain Relief, etc.)
   - **Manufacturer**: Company name
   - **Strength**: Dosage (e.g., "500mg")
   - **Form**: Tablet, Capsule, Syrup, Injection, or Cream
   - **Unit Price**: Price per unit in dollars
3. Click **"Add Medicine"**
4. The medicine immediately appears in the table

**Editing a Medicine:**

1. Find the medicine in the table
2. Click the **Edit (pencil) icon** in the Actions column
3. Update the information
4. Click **"Update Medicine"**

**Toggle Active/Inactive Status:**

1. Click the **Power icon** in the Actions column
2. Status changes between Active/Inactive
3. Green badge = Active, Gray badge = Inactive

**Searching:**

- Use the search bar to filter by:
  - Medicine name
  - Generic name
  - Category

---

### 📦 INVENTORY MANAGEMENT

**Understanding the View:**

- **Top Summary Cards:**
  - Total Batches: Number of different batches in stock
  - Inventory Value: Total $ worth of all inventory
  - Expiring Soon: Count of batches expiring within 60 days

- **Color-Coded Rows:**
  - 🔴 **Red background**: Critical - expires in < 30 days
  - 🟡 **Yellow background**: Warning - expires in 30-60 days
  - ⚪ **White background**: Good - expires in > 60 days

**Reading the Table:**

- **Medicine**: Name and manufacturer
- **Batch Number**: Unique batch identifier
- **Quantity**: Current stock count
- **Expiry Date**: When the batch expires
- **Expiry Status**: Badge showing urgency level
- **Location**: Shelf/storage position
- **Cost Price**: Purchase cost per unit
- **Batch Value**: Total value (Quantity × Cost Price)

**Filtering:**

1. **Filter by Status dropdown:**
   - "All Items" - Shows everything
   - "Expiring Soon" - Only critical/warning items
   - "Low Stock" - Items with quantity < 100

2. **Search bar:**
   - Search by medicine name or batch number

---

### 🛒 PURCHASE ORDERS

**Creating a Purchase Order:**

1. Click **"Create Purchase Order"** button
2. Fill in the form:
   - **Supplier Name**: Vendor/distributor name
   - **Order Date**: Date of order placement
   - **Expected Delivery**: Anticipated arrival date
   - **Add Items**: Click "Add Item" for each medicine
     - Select medicine from dropdown
     - Enter quantity needed
     - Enter unit cost
   - **Notes**: Any special instructions
3. Click **"Create Order"**
4. Order appears in the table with "Pending" status

**Managing Order Status:**

Each order has a status badge:
- 🔵 **Pending**: Order placed, waiting for approval
- 🟢 **Approved**: Approved, waiting for delivery
- ✅ **Received**: Delivered and stock updated
- 🔴 **Cancelled**: Order cancelled

**When Order is Received:**

1. Find the order in the table
2. Change status to "Received"
3. Stock automatically updates in Inventory module

---

### 📋 PRESCRIPTIONS

**Processing a Prescription:**

1. Click **"New Prescription"** button
2. Enter prescription details:
   - **Prescription ID**: Unique identifier (auto-generated if left blank)
   - **Patient Name**: Full name
   - **Doctor Name**: Prescribing physician
   - **Date**: Prescription date
   - **Add Medicines**: Click "Add Item"
     - Select medicine from dropdown
     - Enter quantity prescribed
   - **Instructions**: Dosage and usage instructions
3. Click **"Create Prescription"**

**Fulfilling a Prescription:**

1. When status is set to **"Fulfilled"**:
   - Stock is **automatically deducted** from inventory
   - Each medicine quantity is reduced
   - Patient receives their medication

**Prescription Status:**

- 🟡 **Pending**: Waiting to be filled
- 🟢 **Fulfilled**: Completed and stock deducted
- 🔴 **Cancelled**: Prescription cancelled

---

### 💰 SALES & BILLING (POS)

**Making a Sale:**

1. **Search for Medicine:**
   - Type in the search box
   - Matching medicines appear below

2. **Add to Cart:**
   - Click **"Add"** next to the medicine
   - Or adjust quantity and click "Add"
   - Item appears in the cart on the right

3. **Adjust Quantities:**
   - Use +/- buttons in cart
   - Or click 🗑️ to remove item

4. **Review Total:**
   - **Subtotal**: Sum of all items
   - **Tax (8%)**: Automatically calculated
   - **Total**: Final amount to collect

5. **Complete Sale:**
   - Click **"Complete Sale"** button
   - Sale is recorded
   - Stock is **automatically deducted** from inventory
   - Cart clears for next customer

---

## 🔧 Backend Architecture

### How It Works

**Data Storage:**
- All data is stored in **Supabase KV Store** (key-value database)
- Data persists across sessions
- Real-time updates across all modules

**Key Prefixes:**
- `medicine:` - Medicine catalog entries
- `inventory:` - Inventory batch records
- `po:` - Purchase orders
- `prescription:` - Patient prescriptions
- `sale:` - Sales transactions
- `system:initialized` - Initialization flag

**Automatic Stock Management:**
- ✅ When prescription is fulfilled → stock deducted
- ✅ When sale is completed → stock deducted
- ✅ When purchase order is received → stock increased

**API Endpoints:**
```
/make-server-8fd38b42/medicines           (GET, POST)
/make-server-8fd38b42/medicines/:id       (GET, PUT, DELETE)
/make-server-8fd38b42/inventory           (GET, POST)
/make-server-8fd38b42/inventory/:id/stock (PATCH)
/make-server-8fd38b42/purchase-orders     (GET, POST)
/make-server-8fd38b42/prescriptions       (GET, POST)
/make-server-8fd38b42/sales               (GET, POST)
/make-server-8fd38b42/dashboard/stats     (GET)
/make-server-8fd38b42/initialize          (POST)
```

---

## 🧪 Testing the System

### Test Scenario 1: Complete Medicine Flow

1. **Add a Medicine:**
   - Go to Medicine Master
   - Add "Aspirin 100mg"
   - Note the medicine ID

2. **Add Inventory:**
   - Go to Inventory
   - You'll see the existing batches
   - (Note: Currently inventory is pre-populated)

3. **Make a Sale:**
   - Go to Sales & Billing
   - Search for "Aspirin"
   - Add to cart (quantity: 10)
   - Complete sale

4. **Check Inventory:**
   - Return to Inventory
   - Find Aspirin batch
   - Stock should be reduced by 10

5. **View Dashboard:**
   - Go to Dashboard
   - Today's Sales should increase
   - Sales count should show +1 transaction

### Test Scenario 2: Low Stock Alert

1. **Go to Inventory** and note items with low stock (< reorder level)
2. **Go to Dashboard**
3. **Check Low Stock Alerts card** - should show count
4. **Check Low Stock Alerts list** - should show those items

### Test Scenario 3: Expiring Medicines

1. **Go to Inventory**
2. **Look for items** with yellow or red background
3. **Go to Dashboard**
4. **Check Expiring Medicines card** - should show count
5. **Check Expiring Medicines list** - should show those batches

---

## 🔍 Troubleshooting

### Issue: No data appears

**Solution:**
1. Check browser console for errors (F12 → Console tab)
2. Verify initialization ran (should happen automatically)
3. Refresh the page

### Issue: "API request failed" error

**Solution:**
1. Check that Supabase is connected
2. Look at console logs for specific error message
3. Verify network connectivity

### Issue: Stock not deducting after sale

**Solution:**
1. Check console for error messages
2. Verify the sale was completed (check Sales module)
3. Refresh Inventory page to see updated stock

### Issue: Dashboard not updating

**Solution:**
1. Wait 30 seconds (auto-refresh interval)
2. Or navigate away and back to Dashboard
3. Or refresh the entire page

---

## 📱 Key Features Summary

✅ **Multi-tenant SaaS Design** - Tenant info in top bar  
✅ **Role-based UI** - Prepared for user roles  
✅ **Real-time Dashboard** - Auto-refresh every 30s  
✅ **Smart Alerts** - Low stock and expiry warnings  
✅ **Automatic Stock Management** - Sales/prescriptions auto-deduct  
✅ **Batch Tracking** - Track each medicine batch separately  
✅ **Search & Filter** - Find data quickly  
✅ **Responsive Design** - Works on all screen sizes  
✅ **Professional UI** - Clean, modern Figma-style design  
✅ **Persistent Storage** - All data saved to backend  

---

## 🎯 Next Steps & Enhancements

**Optional improvements you could add:**

1. **Authentication**
   - User login/signup
   - Role-based access (Admin, Pharmacist, Cashier)

2. **Advanced Reporting**
   - Monthly sales reports
   - Inventory turnover analysis
   - Profit/loss calculations

3. **Supplier Management**
   - Dedicated supplier database
   - Contact information
   - Order history per supplier

4. **Customer Management**
   - Customer database
   - Prescription history
   - Loyalty points

5. **Barcode Scanning**
   - Quick medicine lookup
   - Faster checkout

---

## 📞 Support

If you encounter any issues:

1. Check the Troubleshooting section above
2. Review browser console for error messages
3. Verify all steps were followed correctly
4. Try refreshing the page

---

## 🎉 You're All Set!

Your pharmacy management system is fully functional with:
- ✅ Backend API connected
- ✅ Sample data loaded
- ✅ All 6 modules working
- ✅ Real-time updates enabled
- ✅ Automatic stock management active

**Start by exploring the Dashboard, then try adding a medicine and making a test sale!**

---

*Built with React, Tailwind CSS, Recharts, and Supabase*
