#!/bin/bash
# Foolproof database import script for Gateway Router
# This script safely imports the database backup without throwing errors if data already exists.

DB_CONTAINER="gateway_db_prod"
DB_USER="gateway_user"
DB_NAME="gateway_router"

echo "Checking if database container is running..."
if ! docker ps | grep -q $DB_CONTAINER; then
    echo "Error: Database container '$DB_CONTAINER' is not running."
    echo "Please start the services first using: docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

echo "Waiting for PostgreSQL to be ready..."
until docker exec -i $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; do
  sleep 2
done

echo "Checking if database is already initialized..."
# Check if there is data in the admins table (meaning FastAPI has already seeded it or it was imported before)
HAS_DATA=$(docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM admins;" 2>/dev/null | tr -d ' ' | tr -d '\n')

if [ "$HAS_DATA" != "" ] && [ "$HAS_DATA" -gt 0 ]; then
    echo "======================================================"
    echo "Database is already initialized and contains data."
    echo "Skipping import to prevent duplicate key errors."
    echo "The application is ready to use!"
    echo "======================================================"
else
    echo "Importing initial database from db/backup.sql..."
    # We use -q to make psql quiet, and redirect stderr to hide notices
    cat db/backup.sql | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -q > /dev/null 2>&1
    echo "======================================================"
    echo "Database imported successfully!"
    echo "======================================================"
fi
