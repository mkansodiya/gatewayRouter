# Gateway Router Deployment Guide

This guide will walk you through the process of deploying the Gateway Router application from start to finish, including configuring the environment, starting the services, and importing the database.

## Prerequisites
- A server (e.g., Ubuntu/Linux) with **Docker** and **Docker Compose** installed.
- Ensure ports `8000`, `5173`, and `5432` are available or adjust them as needed in the configuration.

## Step 1: Prepare the Project

1. Upload or clone the project repository to your server.
2. Navigate to the project root directory:
   ```bash
   cd /path/to/gatewayRouter
   ```

## Step 2: Environment Configuration

Create a `.env` file in the root directory of the project. This file will be used by `docker-compose.prod.yml` to set up the necessary environment variables.

You can create it by running:
```bash
cat <<EOF > .env
# Database settings
DB_USER=gateway_user
DB_PASSWORD=gateway_password
DB_NAME=gateway_router

# Frontend & Backend URL settings
FRONTEND_BASE_URL=https://your-frontend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com
EOF
```
*Note: Make sure to replace the URLs with your actual domain names or server IP address.*

## Step 3: Start the Application Services

We will use the production Docker Compose file to build and start the containers in detached mode.

Run the following commands:
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

This will:
- Start a PostgreSQL database (`gateway_db_prod`).
- Build and start the Python FastAPI backend (`gateway_backend_prod`).
- Build and start the React Vite frontend using Nginx (`gateway_frontend_prod`).

You can check if all services are running properly with:
```bash
docker ps
```

## Step 4: Import the Database

Once the database container is up and running, you need to import the initial database structure and data from `db/backup.sql`.

Run the following command from the project root directory:

```bash
cat db/backup.sql | docker exec -i gateway_db_prod psql -U gateway_user -d gateway_router
```

*Note: If you changed the `DB_USER` or `DB_NAME` in your `.env` file, make sure to update `gateway_user` and `gateway_router` in the command above accordingly.*

## Step 5: Verify Deployment

1. **Frontend Dashboard**: Access the application through your web browser at `http://<your-server-ip>:5173` (or your configured frontend domain).
2. **Backend API**: The API should be accessible at `http://<your-server-ip>:8000`. You can also check the interactive API documentation at `http://<your-server-ip>:8000/docs`.

## Step 6: Webhook Configuration

After deploying the application, you need to configure the following webhook URLs in your respective payment provider dashboards. Replace `https://your-backend-domain.com` with the actual public URL of your backend (defined as `VITE_API_BASE_URL`).

### 1. OkPay
**URL:** `https://your-backend-domain.com/api/webhooks/okpay`
- **Method:** `POST`
- **Payload Format:** Form-encoded data
- **Security:** Requires MD5 signature verification.

### 2. IMB
**URL:** `https://your-backend-domain.com/api/webhooks/imb`
- **Method:** `POST`
- **Payload Format:** Form-encoded data
- **Security:** Token-only (no signature verification).

### 3. LGPay
**URL:** `https://your-backend-domain.com/api/webhooks/lgpay`
- **Method:** `POST`
- **Payload Format:** Form-encoded data
- **Security:** Requires UPPERCASE MD5 signature verification.

### 4. JazPays
**URL:** `https://your-backend-domain.com/api/webhooks/jazpays`
- **Method:** `POST`
- **Payload Format:** JSON or Form-encoded data

## Useful Commands

- **View Logs**:
  ```bash
  docker-compose -f docker-compose.prod.yml logs -f
  ```
- **Stop Services**:
  ```bash
  docker-compose -f docker-compose.prod.yml down
  ```
