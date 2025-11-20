/**
 * Centralized API configuration using environment variables
 * All API calls should use this base URL
 */

// Get API base URL from environment variable
// Falls back to proxy path if not defined (for development with Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Log the configuration on initialization
console.log('🌐 API Configuration:', {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  API_BASE_URL,
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
});

/**
 * Helper function to build full API URL
 * @param {string} endpoint - API endpoint path (e.g., '/employees', '/auth/login')
 * @returns {string} Full API URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present in endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;
  console.log(`🔗 API URL: ${fullUrl}`);
  return fullUrl;
};

/**
 * Enhanced fetch wrapper with error handling
 * @param {string} endpoint - API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  try {
    // ✅ FIX: Only set Content-Type header if body is NOT FormData
    const headers = { ...options.headers };
    
    // Check if body is FormData - if so, don't set Content-Type (let browser handle it)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // If it's FormData, remove any Content-Type header that might have been set
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Log response details for debugging
    console.log(`📡 Response from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });
    
    // Note: Don't consume the response body here - let the caller handle it
    // This prevents "body already read" errors
    
    return response;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * GET request helper
 */
export const apiGet = async (endpoint) => {
  return apiFetch(endpoint, { method: 'GET' });
};

/**
 * POST request helper
 */
export const apiPost = async (endpoint, data) => {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * PUT request helper
 */
export const apiPut = async (endpoint, data) => {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 */
export const apiDelete = async (endpoint) => {
  return apiFetch(endpoint, { method: 'DELETE' });
};

/**
 * POST request helper for multipart form data
 * ✅ NEW: Added specifically for file uploads
 */
export const apiPostMultipart = async (endpoint, formData) => {
  return apiFetch(endpoint, {
    method: 'POST',
    body: formData, // FormData object
    // Don't set Content-Type - browser will set it with boundary
  });
};

export const apiPatch = async (endpoint, data) => {
  const token = localStorage.getItem("authToken");
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  });
};


export default {
  getApiUrl,
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPostMultipart, // ✅ Export new helper
  apiPatch,
};
