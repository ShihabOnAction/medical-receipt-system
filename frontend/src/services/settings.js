import api from './api.js';

export async function getSettings() {
  const { data } = await api.get('/settings');
  return data.data;
}

export async function updateSettings(payload) {
  const { data } = await api.patch('/admin/settings', payload);
  return data;
}
