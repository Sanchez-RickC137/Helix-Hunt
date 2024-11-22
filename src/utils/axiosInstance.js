/**
 * Axios instance configuration
 * Sets up base URL and interceptors for API requests
 * Handles authentication token expiration
 */

import axios from 'axios';


const isProduction = process.env.NODE_ENV === 'production';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: isProduction ? '' : 'http://localhost:5001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(request => {
  console.log('Making request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    baseURL: request.baseURL,
    headers: request.headers
  });
  return request;
});

/**
 * Response interceptor
 * Handles token expiration and authentication errors
 * Redirects to login page when token expires
 */
axiosInstance.interceptors.response.use(
  // Success handler
  (response) => response,
  // Error handler
  async (error) => {
    if (error.response && error.response.status === 401 && error.response.data.isExpired) {
      // Clear expired token
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;