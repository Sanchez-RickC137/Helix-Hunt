/**
 * Axios instance configuration
 * Sets up base URL and interceptors for API requests
 * Handles authentication token expiration
 */

import axios from 'axios';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001',
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