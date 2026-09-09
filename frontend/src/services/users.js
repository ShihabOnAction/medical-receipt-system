import api from './api.js';

export async function listUsers(params) {
  const { data } = await api.get('/admin/users', { params });
  return data.data;
}

export async function userOptions() {
  const { data } = await api.get('/admin/users/options');
  return data.data;
}

export async function setUserStatus(id, status, reason) {
  const { data } = await api.patch(`/admin/users/${id}/status`, { status, reason });
  return data;
}

export async function setUserRole(id, role) {
  const { data } = await api.patch(`/admin/users/${id}/role`, { role });
  return data;
}
