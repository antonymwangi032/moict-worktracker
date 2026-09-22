import { api } from './api';

export const notificationsService = {
  list:        ()   => api.get('/notifications'),
  markAllRead: ()   => api.patch('/notifications/read-all'),
  create:      (p)  => api.post('/notifications', p),
  remove:      (id) => api.delete(`/notifications/${id}`)
};