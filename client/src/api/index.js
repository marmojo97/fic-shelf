import axios from 'axios';

// In development, Vite proxies /api → localhost:3001.
// In production, set VITE_API_URL to your Railway backend URL (e.g. https://archivd-production.up.railway.app)
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const api = axios.create({ baseURL: BASE });

// Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('archivd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateMe = (data) => api.put('/auth/me', data);

// Fics
export const getFics = (params) => api.get('/fics', { params });
export const getFic = (id) => api.get(`/fics/${id}`);
export const createFic = (data) => api.post('/fics', data);
export const updateFic = (id, data) => api.put(`/fics/${id}`, data);
export const deleteFic = (id) => api.delete(`/fics/${id}`);
export const bulkMoveFics = (ficIds, shelf) => api.post('/fics/bulk-move', { ficIds, shelf });
export const exportCsv = () => api.get('/fics/export/csv', { responseType: 'blob' });
export const exportJson = () => api.get('/fics/export/json', { responseType: 'blob' });

// Bookmarks
export const addBookmark = (ficId, data) => api.post(`/fics/${ficId}/bookmarks`, data);
export const deleteBookmark = (ficId, bookmarkId) => api.delete(`/fics/${ficId}/bookmarks/${bookmarkId}`);

// Stats
export const getStats = (year) => api.get('/stats', { params: year ? { year } : {} });

// Shelves
export const getCustomShelves = () => api.get('/shelves/custom');
export const createCustomShelf = (data) => api.post('/shelves/custom', data);
export const deleteCustomShelf = (id) => api.delete(`/shelves/custom/${id}`);

// Rec Lists
export const getRecLists = () => api.get('/reclists');
export const createRecList = (data) => api.post('/reclists', data);
export const updateRecList = (id, data) => api.put(`/reclists/${id}`, data);
export const deleteRecList = (id) => api.delete(`/reclists/${id}`);
export const addFicToRecList = (listId, ficId, note) => api.post(`/reclists/${listId}/fics`, { ficId, note });
export const removeFicFromRecList = (listId, ficId) => api.delete(`/reclists/${listId}/fics/${ficId}`);

// AO3
export const fetchAo3 = (url) => api.post('/ao3/fetch', { url });

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const triggerWipCheck = () => api.post('/notifications/wip-check');

// Import
export const previewAo3Csv = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/import/ao3-csv/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const confirmAo3Csv = (file, shelf) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('shelf', shelf);
  return api.post('/import/ao3-csv/confirm', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const bulkSortFics = (assignments) => api.post('/import/bulk-sort', { assignments });
export const markOnboardingDone = () => api.post('/auth/onboarding-done');
export const getInviteRequired = () => api.get('/auth/invite-required');

// Social
export const searchUsers = (q) => api.get('/social/users/search', { params: { q } });
export const getUserProfile = (username) => api.get(`/social/users/${username}`);
export const followUser = (userId) => api.post(`/social/follow/${userId}`);
export const unfollowUser = (userId) => api.delete(`/social/follow/${userId}`);
export const getFollowing = () => api.get('/social/following');
export const discoverRecLists = (params) => api.get('/social/reclists/discover', { params });
export const saveRecList = (id) => api.post(`/social/reclists/${id}/save`);
export const unsaveRecList = (id) => api.delete(`/social/reclists/${id}/save`);
export const getSavedRecLists = () => api.get('/social/reclists/saved');
export const getPublicRecList = (id) => api.get(`/social/reclists/${id}/public`);

// Feedback
export const submitFeedback = (data) => api.post('/feedback', data);

// Changelog
export const getChangelog = () => api.get('/changelog');
export const getChangelogUnread = () => api.get('/changelog/unread');
export const markChangelogViewed = () => api.post('/changelog/viewed');

// Beta banner
export const getBetaBanner = () => api.get('/beta-banner');
export const dismissBetaBanner = () => api.post('/beta-banner/dismiss');

// Admin (uses a separate token stored as archivd_admin_token)
const adminApi = axios.create({ baseURL: '/api/admin' });
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('archivd_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const adminLogin = (password) => adminApi.post('/auth', { password });
export const adminGetStats = () => adminApi.get('/stats');
export const adminGetInviteCodes = () => adminApi.get('/invite-codes');
export const adminCreateInviteCode = (data) => adminApi.post('/invite-codes', data);
export const adminUpdateInviteCode = (id, data) => adminApi.put(`/invite-codes/${id}`, data);
export const adminDeleteInviteCode = (id) => adminApi.delete(`/invite-codes/${id}`);
export const adminGetFeedback = () => adminApi.get('/feedback');
export const adminGetFeedbackScreenshot = (id) => adminApi.get(`/feedback/${id}/screenshot`);
export const adminDeleteFeedback = (id) => adminApi.delete(`/feedback/${id}`);
export const adminGetChangelog = () => adminApi.get('/changelog');
export const adminCreateChangelogEntry = (data) => adminApi.post('/changelog', data);
export const adminUpdateChangelogEntry = (id, data) => adminApi.put(`/changelog/${id}`, data);
export const adminDeleteChangelogEntry = (id) => adminApi.delete(`/changelog/${id}`);
export const adminGetBetaBanner = () => adminApi.get('/beta-banner');
export const adminSetBetaBanner = (enabled) => adminApi.put('/beta-banner', { enabled });

export default api;
