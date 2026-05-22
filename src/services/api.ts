import axios from 'axios';

const http = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Accept': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    throw new Error(message);
  }
);

export const api = {
  auth: {
    login: (credentials: any) => http.post('/auth/login', credentials),
    register: (data: any) => http.post('/auth/register', data),
    me: () => http.get('/auth/me'),
    updateProfile: (data: any) => http.put('/auth/profile', data),
  },

  catechumens: {
    list: () => http.get('/catechumens'),
    get: (id: string | number) => http.get(`/catechumens/${id}`),
    create: (data: any) => http.post('/catechumens', data),
    update: (id: string | number, data: any) => http.put(`/catechumens/${id}`, data),
    delete: (id: string | number) => http.delete(`/catechumens/${id}`),
    addReportCard: (id: string | number, data: any) => http.post(`/catechumens/${id}/report-cards`, data),
    addSacrament: (id: string | number, data: any) => http.post(`/catechumens/${id}/sacraments`, data),
  },

  reports: {
    listAll: () => http.get('/all-report-cards'),
    get: (id: string | number) => http.get(`/report-cards/${id}`),
    update: (id: string | number, data: any) => http.put(`/report-cards/${id}`, data),
  },

  sacraments: {
    listAll: () => http.get('/all-sacraments'),
  },

  subjects: {
    list: () => http.get('/subjects'),
    create: (data: any) => http.post('/subjects', data),
    update: (id: string | number, data: any) => http.put(`/subjects/${id}`, data),
    delete: (id: string | number) => http.delete(`/subjects/${id}`),
  },

  stats: {
    get: () => http.get('/stats'),
  },
};
