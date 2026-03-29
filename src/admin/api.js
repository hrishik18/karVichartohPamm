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
export const getPlaylist = () => api.get('/api/radio/playlist');

// Admin: Live speaker toggle
export const goLive = () => api.post('/api/admin/live');
export const stopLive = () => api.post('/api/admin/live/stop');

// Admin: Song controls
export const setSong = (title, url, duration) =>
  api.post('/api/admin/song', { title, url, duration });

// Playlist management
export const addSongToPlaylist = (title, url, duration) =>
  api.post('/api/admin/song/playlist', { title, url, duration });
export const removeSongFromPlaylist = (id) =>
  api.delete(`/api/admin/song/${encodeURIComponent(id)}`);
export const playSongFromPlaylist = (id) =>
  api.post('/api/admin/song/play', { id });
export const editSongInPlaylist = (id, updates) =>
  api.patch(`/api/admin/song/${encodeURIComponent(id)}`, updates);
export const reorderSong = (id, direction) =>
  api.post('/api/admin/song/reorder', { id, direction });

// Bulk playlist actions
export const bulkRemoveSongs = (ids) =>
  api.post('/api/admin/song/bulk-remove', { ids });
export const shufflePlaylist = () =>
  api.post('/api/admin/song/shuffle');
export const clearPlaylist = () =>
  api.delete('/api/admin/song/clear');

// Upload (supports multiple files, max 10)
export const uploadSongs = (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return api.post('/api/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
