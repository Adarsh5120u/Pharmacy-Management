#!/bin/bash

# Pharmacy Backend Setup Script
echo "Pharmacy Backend Setup"
echo "========================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 14 or later."
    exit 1
fi

echo "OK: Node.js version: $(node --version)"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL is not installed. Please install PostgreSQL."
    exit 1
fi

echo "OK: PostgreSQL is installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "OK: .env file created (update with your database credentials)"
else
    echo "INFO: .env file already exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "OK: Dependencies installed"
else
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "Setup complete"
echo ""
echo "Next steps:"
echo "1. Update .env file with your PostgreSQL credentials"
echo "2. Create database: createdb -U postgres pharmacy_db"
echo "3. Run schema: psql -U postgres -d pharmacy_db -f schema.sql"
echo "4. Start server: npm run dev"
echo ""
