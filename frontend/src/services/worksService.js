import { api } from './api';

export const worksService = {
  list:    ()        => api.get('/works'),
  getOne:  (id)      => api.get(`/works/${id}`),
  create:  (payload) => api.post('/works', payload),
  update:  (id, p)   => api.patch(`/works/${id}`, p),
  remove:  (id)      => api.delete(`/works/${id}`),
  setState: (id, payload) => api.post(`/works/${id}/state`, payload),
  uploadFile: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload(`/works/${id}/file`, fd);
  }
};