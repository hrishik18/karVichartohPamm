import axios from 'axios';
import { getToken, removeToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 (expired/invalid token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeToken();
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/api/auth/login', { email, password });

// Radio status (public)
export const getRadioStatus = () => api.get('/api/radio/status');
export const getRadioQueue = () => api.get('/api/radio/queue');

// Admin actions
export const setMode = (mode) => api.post('/api/admin/mode', { mode });
export const setSpeaker = (name) => api.post('/api/admin/speaker', { name });
export const setSong = (title, url) => api.post('/api/admin/song', { title, url });

// Queue management
export const addSongToQueue = (title, url) =>
  api.post('/api/admin/song/queue', { title, url });
export const removeSongFromQueue = (id) =>
  api.delete(`/api/admin/song/${encodeURIComponent(id)}`);
export const addSpeakerToQueue = (name) =>
  api.post('/api/admin/speaker/queue', { name });

// Select from queue
export const selectSong = (id) => api.post('/api/admin/song/select', { id });
export const selectSpeaker = (id) =>
  api.post('/api/admin/speaker/select', { id });

// Upload
export const uploadSong = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
