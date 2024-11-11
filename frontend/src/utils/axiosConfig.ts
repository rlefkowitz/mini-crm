import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.API_BASE_URL || 'http://localhost:8888',
});

axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);

export default axiosInstance;
