import { api } from './api';

export const usersService = {
  list:              ()          => api.get('/users'),
  regular:           ()          => api.get('/users/regular'),
  create:            (payload)   => api.post('/users', payload),
  updateRole:        (id, role)  => api.patch(`/users/${id}/role`, { role }),
  remove:            (id)        => api.delete(`/users/${id}`),
  resetUserPassword: (id, newPassword) =>
                       api.post(`/users/${id}/reset-password`, { newPassword }),

  findUser:    (users, email) => users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()),
  getUserById: (users, id)    => users.find(u => String(u.id) === String(id))
};