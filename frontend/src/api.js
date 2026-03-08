import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const violationApi = {
    getAll: () => api.get('/violations/'),
    create: (data) => api.post('/violations/', data),
    getPending: () => api.get('/violations/?status=Pending OSA Review'),
};

export const studentApi = {
    getByStudentId: (id) => api.get(`/students/${id}/`),
    getAll: () => api.get('/students/'),
};

export default api;
