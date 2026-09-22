import { api } from './api';

export const documentsService = {
  list:   ()   => api.get('/documents'),
  remove: (id) => api.delete(`/documents/${id}`),

  upload: ({ title, description, file, shareAll, selectedUsers }) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('description', description || '');
    fd.append('shareAll', shareAll ? '1' : '0');
    (selectedUsers || []).forEach(id => fd.append('userIds[]', id));
    return api.upload('/documents', fd);
  },

  responses: (docId) => api.get(`/documents/${docId}/responses`),

  addResponse: ({ docId, text, file }) => {
    const fd = new FormData();
    fd.append('text', text);
    if (file) fd.append('file', file);
    return api.upload(`/documents/${docId}/responses`, fd);
  },

  fileUrl: (storagePath) => api.fileUrl(storagePath)
};