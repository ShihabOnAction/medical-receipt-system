import api from './api.js';

export async function listTests({ includeInactive = false, search = '' } = {}) {
  const { data } = await api.get('/tests', { params: { includeInactive, search } });
  return data.data;
}

export async function createTest(payload) {
  const { data } = await api.post('/admin/tests', payload);
  return data;
}

export async function updateTest(id, payload) {
  const { data } = await api.patch(`/admin/tests/${id}`, payload);
  return data;
}

export async function deleteTest(id) {
  const { data } = await api.delete(`/admin/tests/${id}`);
  return data;
}

export async function reorderTests(order) {
  const { data } = await api.patch('/admin/tests/reorder', { order });
  return data;
}
