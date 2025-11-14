/**
 * Axios instance configured with environment variable
 * Use this instead of creating individual axios instances
 */
import axios from 'axios';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with base URL from environment
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging (development only)
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use((config) => {
    console.log(`🔗 Axios Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`✅ Axios Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(`❌ Axios Error: ${error.config?.url}`, error.message);
      return Promise.reject(error);
    }
  );
}

export const apiGet = (endpoint, config = {}) => {
  return apiClient.get(endpoint, config);
};

export const apiPost = (endpoint, data, config = {}) => {
  return apiClient.post(endpoint, data, config);
};

export const apiPut = (endpoint, data, config = {}) => {
  return apiClient.put(endpoint, data, config);
};

export const apiDelete = (endpoint, config = {}) => {
  return apiClient.delete(endpoint, config);
};

export default apiClient;
