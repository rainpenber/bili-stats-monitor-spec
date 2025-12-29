# Quickstart

This document provides instructions on how to set up and run the project for local development.

## Prerequisites

- [Node.js](https://nodejs.org/) (v22.0.0 or higher)
- [pnpm](https://pnpm.io/) (v9.0.0 or higher)

## Setup

1. **Install Dependencies**

   From the monorepo root directory, run the following command to install all dependencies for the frontend and backend workspaces:

   ```bash
   pnpm install
   ```

## Running the Application

This project includes a mock API server and a frontend web application. You can run them separately or together.

### Run Both (Recommended)

To start both the mock server and the frontend development server concurrently, run the following command from the root directory:

```bash
pnpm dev:all
```

This will:
- Start the **Mock API Server** on `http://localhost:8080`.
- Start the **Frontend Web App** on `http://localhost:5173`.

The frontend is configured to proxy API requests from `/api` to the mock server, so everything should work out of the box.

### Run Separately

If you need to run the services independently, you can use two separate terminals.

**Terminal 1: Start the Mock API Server**

```bash
pnpm dev:mock
```

**Terminal 2: Start the Frontend Web App**

```bash
pnpm dev:web
```

### Testing & Debugging

In development mode, you can use the browser's developer console to trigger test functions:

- **Test Toast Notifications**:
  ```javascript
  window.__demo_toast()
  ```

- **Test API Requests** (using the unified `http` client):
  ```javascript
  // Successful GET request
  await window.__http_get('/api/v1/logs')

  // Failed GET request (404)
  await window.__http_get('/api/not-exist')

  // Timeout request
  await window.__http_get('/api/v1/logs', { timeoutMs: 1 })
  ```

## Building for Production

To build the frontend application for production, run:

```bash
pnpm build:web
```

The output will be located in `frontend/web/dist`.
