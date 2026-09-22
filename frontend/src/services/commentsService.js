import { api } from './api';

export const commentsService = {
  listForWork: (workId) => api.get(`/comments?workId=${workId}`),
  add:         (payload) => api.post('/comments', payload)
};