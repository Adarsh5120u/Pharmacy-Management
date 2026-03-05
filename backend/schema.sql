-- Pharmacy Database Schema

CREATE TABLE MEDICINE (
  medicine_id SERIAL PRIMARY KEY,
  medicine_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  generic_name VARCHAR(150),
  category VARCHAR(100),
  manufacturer VARCHAR(150),
  dosage_form VARCHAR(50),
  strength VARCHAR(50),
  unit_price NUMERIC DEFAULT 0,
  prescription_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MEDICINE_BATCH (
  batch_id SERIAL PRIMARY KEY,
  medicine_id INT REFERENCES MEDICINE(medicine_id) ON DELETE CASCADE,
  batch_number VARCHAR(100),
  expiry_date DATE,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  location VARCHAR(100) DEFAULT 'Shelf A',
  reorder_level INT DEFAULT 100,
  purchase_quantity INT,
  quantity_available INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SUPPLIER (
  supplier_id SERIAL PRIMARY KEY,
  supplier_name VARCHAR(150),
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PURCHASE_ORDER (
  purchase_order_id SERIAL PRIMARY KEY,
  supplier_id INT REFERENCES SUPPLIER(supplier_id) ON DELETE CASCADE,
  order_date DATE,
  status VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PURCHASE_ORDER_ITEM (
  item_id SERIAL PRIMARY KEY,
  purchase_order_id INT REFERENCES PURCHASE_ORDER(purchase_order_id) ON DELETE CASCADE,
  medicine_id INT REFERENCES MEDICINE(medicine_id) ON DELETE CASCADE,
  quantity INT,
  unit_price NUMERIC
);

CREATE TABLE PRESCRIPTION (
  prescription_id SERIAL PRIMARY KEY,
  patient_id INT,
  patient_name VARCHAR(150),
  doctor_id INT,
  doctor_name VARCHAR(150),
  prescription_date DATE,
  status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PRESCRIPTION_ITEM (
  item_id SERIAL PRIMARY KEY,
  prescription_id INT REFERENCES PRESCRIPTION(prescription_id) ON DELETE CASCADE,
  medicine_id INT REFERENCES MEDICINE(medicine_id) ON DELETE CASCADE,
  dosage VARCHAR(50),
  duration_days INT
);

CREATE TABLE PHARMACY_SALE (
  sale_id SERIAL PRIMARY KEY,
  prescription_id INT REFERENCES PRESCRIPTION(prescription_id) ON DELETE SET NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount NUMERIC,
  payment_method VARCHAR(50),
  customer_name VARCHAR(150) DEFAULT 'Walk-in Customer'
);

CREATE TABLE PHARMACY_SALE_ITEM (
  item_id SERIAL PRIMARY KEY,
  sale_id INT REFERENCES PHARMACY_SALE(sale_id) ON DELETE CASCADE,
  medicine_id INT REFERENCES MEDICINE(medicine_id) ON DELETE CASCADE,
  batch_id INT REFERENCES MEDICINE_BATCH(batch_id),
  quantity INT,
  price NUMERIC
);

-- Indexes for common queries
CREATE INDEX idx_medicine_batch_medicine_id ON MEDICINE_BATCH(medicine_id);
CREATE INDEX idx_medicine_batch_expiry_date ON MEDICINE_BATCH(expiry_date);
CREATE INDEX idx_purchase_order_supplier_id ON PURCHASE_ORDER(supplier_id);
CREATE INDEX idx_purchase_order_status ON PURCHASE_ORDER(status);
CREATE INDEX idx_prescription_patient_id ON PRESCRIPTION(patient_id);
CREATE INDEX idx_prescription_status ON PRESCRIPTION(status);
CREATE INDEX idx_pharmacy_sale_date ON PHARMACY_SALE(sale_date);

-- Backward-compatible migration for existing databases
ALTER TABLE MEDICINE
ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;

ALTER TABLE MEDICINE
ADD COLUMN IF NOT EXISTS generic_name VARCHAR(150);

UPDATE MEDICINE
SET generic_name = name
WHERE generic_name IS NULL;

ALTER TABLE MEDICINE_BATCH
ADD COLUMN IF NOT EXISTS location VARCHAR(100);

ALTER TABLE MEDICINE_BATCH
ADD COLUMN IF NOT EXISTS reorder_level INT;

ALTER TABLE MEDICINE_BATCH
ADD COLUMN IF NOT EXISTS purchase_quantity INT;

ALTER TABLE MEDICINE_BATCH
ALTER COLUMN location SET DEFAULT 'Shelf A';

ALTER TABLE MEDICINE_BATCH
ALTER COLUMN reorder_level SET DEFAULT 100;

UPDATE MEDICINE_BATCH
SET purchase_quantity = quantity_available
WHERE purchase_quantity IS NULL;

ALTER TABLE PHARMACY_SALE
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);

UPDATE PHARMACY_SALE
SET customer_name = 'Walk-in Customer'
WHERE customer_name IS NULL OR TRIM(customer_name) = '';
