# API Configuration Guide

This project now uses environment variables for API configuration, making it easy to switch between different backend environments (development, staging, production).

## Environment Variables

### Required Variables

- `VITE_API_BASE_URL`: The base URL for your backend API (including `/api` path)

### Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file with your backend URL:**
   ```
   VITE_API_BASE_URL=https://your-backend-url.com/api
   ```

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## Configuration Options

### Development (Local Backend)
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### Production
```env
VITE_API_BASE_URL=https://tconsolutions-64307221061.asia-south1.run.app/api
```

### Using Vite Proxy (Optional)
If you prefer to use Vite's proxy feature during development, you can omit the `VITE_API_BASE_URL` variable, and the app will default to using `/api` paths which will be proxied by Vite according to `vite.config.ts`.

## API Utility Functions

All API calls now use centralized utility functions from `src/lib/api.js`:

### Basic Usage

```javascript
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

// GET request
const response = await apiGet('/employees?page=0&size=10');
const data = await response.json();

// POST request
const response = await apiPost('/auth/login', {
  empId: 'EMP-1001',
  password: 'password123'
});

// PUT request
const response = await apiPut('/task-history/123', {
  status: 'COMPLETED'
});

// DELETE request
const response = await apiDelete('/field-table/456');
```

### Advanced Usage

For custom requests, use the `apiFetch` function:

```javascript
import { apiFetch } from '../lib/api';

const response = await apiFetch('/endpoint', {
  method: 'PATCH',
  body: JSON.stringify(data),
  headers: {
    'Custom-Header': 'value'
  }
});
```

## Updated Files

The following files have been updated to use the new API configuration:

### Core
- `src/lib/api.js` - New centralized API utility
- `src/contexts/AuthContext.jsx` - Authentication context

### Manager Pages
- `src/pages/Manager/ManagerBoard.jsx`
- `src/pages/Manager/Projectspage.jsx`
- `src/pages/Manager/ClientRequirement.jsx`
- `src/pages/Manager/ProjectFieldsPage.jsx`

### Employee Pages
- `src/pages/Employee/EmployeeBoard.jsx`

### Spaces Pages
- `src/pages/SpacesPage.jsx`
- `src/pages/Spaces/ProjectSpacesPage.jsx`

### Configuration
- `vite.config.ts` - Updated to use environment variables
- `.env` - Environment configuration (gitignored)
- `.env.example` - Example configuration template

## Benefits

1. **Easy Environment Switching**: Change backend URL without modifying code
2. **Better Security**: API URLs are not hardcoded in the codebase
3. **Centralized Configuration**: All API calls use the same base URL
4. **Development Flexibility**: Easy to switch between local and remote backends
5. **Consistent Error Handling**: All API calls use the same error handling logic

## Troubleshooting

### Issue: "Unexpected token '<', "<!doctype "... is not valid JSON"

This error occurs when the API returns HTML instead of JSON, usually because:
- The API endpoint is incorrect
- The backend is not running
- The `VITE_API_BASE_URL` is not set correctly

**Solution:**
1. Verify your `.env` file has the correct `VITE_API_BASE_URL`
2. Ensure the backend server is running
3. Check the browser Network tab to see the actual request URL
4. Restart the development server after changing `.env`

### Issue: API calls return 404

**Solution:**
1. Check that `VITE_API_BASE_URL` includes the `/api` path
2. Verify the endpoint path in your code (should NOT start with `/api`)
3. Check browser console for the full URL being requested

### Issue: CORS errors

**Solution:**
1. Ensure your backend has CORS properly configured
2. Verify `changeOrigin: true` is set in `vite.config.ts` proxy settings
3. Check that the backend URL is correct

## Notes

- Environment variables in Vite must be prefixed with `VITE_` to be exposed to the client
- Changes to `.env` require a server restart
- Never commit `.env` file to version control (it's gitignored)
- Always update `.env.example` when adding new environment variables
