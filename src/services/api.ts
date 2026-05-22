const API_URL = 'http://localhost:8000/api';

export const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Something went wrong');
    }
    return response.json();
  },

  auth: {
    login: (credentials: any) => api.fetch('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => api.fetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => api.fetch('/auth/me'),
    updateProfile: (data: any) => api.fetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },

  catechumens: {
    list: () => api.fetch('/catechumens'),
    get: (id: string | number) => api.fetch(`/catechumens/${id}`),
    create: (data: any) => api.fetch('/catechumens', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) => api.fetch(`/catechumens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => api.fetch(`/catechumens/${id}`, { method: 'DELETE' }),
    addReportCard: (id: string | number, data: any) => api.fetch(`/catechumens/${id}/report-cards`, { method: 'POST', body: JSON.stringify(data) }),
    addSacrament: (id: string | number, data: any) => api.fetch(`/catechumens/${id}/sacraments`, { method: 'POST', body: JSON.stringify(data) }),
  },

  reports: {
    listAll: () => api.fetch('/all-report-cards'),
    get: (id: string | number) => api.fetch(`/report-cards/${id}`),
    update: (id: string | number, data: any) => api.fetch(`/report-cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  sacraments: {
    listAll: () => api.fetch('/all-sacraments'),
  },

  subjects: {
    list: () => api.fetch('/subjects'),
    create: (data: any) => api.fetch('/subjects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) => api.fetch(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => api.fetch(`/subjects/${id}`, { method: 'DELETE' }),
  },

  stats: {
    get: () => api.fetch('/stats'),
  }
};
