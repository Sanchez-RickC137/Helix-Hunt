import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001',
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && error.response.data.isExpired) {
      localStorage.removeItem('token');
      // Redirect to login page or update app state to reflect logged out status
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
