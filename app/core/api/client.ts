import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request — attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


apiClient.interceptors.response.use(
  (response) => {
    const serverVersion = response.headers['x-membership-version'];
    if (serverVersion) {
      const storedVersion = localStorage.getItem('membership_version') ?? '0';
      if (serverVersion !== storedVersion) {
        localStorage.setItem('membership_version', serverVersion);
        window.dispatchEvent(new CustomEvent('membership-version-mismatch'));
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);