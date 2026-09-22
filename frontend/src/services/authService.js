import { api } from './api';

export const authService = {
  login:          (email, password) => api.post('/auth/login', { email, password }),
  me:             ()                => api.get('/auth/me'),
  register:       (payload)         => api.post('/auth/register', payload),
  forgotPassword: (email)           => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) =>
                    api.post('/auth/change-password', { currentPassword, newPassword })
};