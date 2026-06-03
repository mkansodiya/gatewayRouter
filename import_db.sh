#!/bin/bash
# Foolproof database import script for Gateway Router

DB_CONTAINER="gateway_db_prod"
DB_USER="gateway_user"
DB_NAME="gateway_router"
BACKUP_FILE="db/backup.sql"

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH."
    exit 1
fi

# 2. Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running. Please start Docker."
    exit 1
fi

# 3. Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file '$BACKUP_FILE' not found."
    exit 1
fi

echo "Checking if database container is running..."
if ! docker ps --format '{{.Names}}' | grep -Eq "^${DB_CONTAINER}\$"; then
    echo "Error: Database container '$DB_CONTAINER' is not running."
    echo "Please start the services first using: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "Waiting for PostgreSQL to be ready (timeout in 60 seconds)..."
TIMEOUT=60
ELAPSED=0
until docker exec -i $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "Error: Timed out waiting for PostgreSQL to be ready."
        exit 1
    fi
done

echo "Checking if database is already initialized..."
# Check if there is data in the admins table. Suppress errors if table doesn't exist yet.
HAS_DATA=$(docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM admins;" 2>/dev/null | tr -d ' ' | tr -d '\n')

# Check if HAS_DATA is a valid number
if [[ "$HAS_DATA" =~ ^[0-9]+$ ]] && [ "$HAS_DATA" -gt 0 ]; then
    echo "======================================================"
    echo "Database is already initialized and contains data."
    echo "Skipping import to prevent duplicate key errors."
    echo "The application is ready to use!"
    echo "======================================================"
else
    echo "Importing initial database from $BACKUP_FILE..."
    cat "$BACKUP_FILE" 2>/dev/null | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -q > /dev/null 2>&1
    
    # Check if import was successful
    if [ $? -eq 0 ]; then
        echo "======================================================"
        echo "Database imported successfully!"
        echo "======================================================"
    else
        echo "Error: Database import failed. Check if your database container is functioning properly."
        exit 1
    fi
fi
