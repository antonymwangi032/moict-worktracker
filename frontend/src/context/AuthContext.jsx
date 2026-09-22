import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  async function login(email, password, selectedRole) {
    const { token, user: u } = await authService.login(email, password);

    if (selectedRole === 'admin' && u.role !== 'admin') {
      throw new Error('This email is not an Admin account. Please use User login.');
    }
    if (selectedRole === 'user' && u.role === 'admin') {
      throw new Error('This email is an Admin account. Please use Admin login.');
    }

    localStorage.setItem('moict_session', JSON.stringify({
      token, email: u.email, role: u.role, loggedIn: true
    }));
    sessionStorage.setItem('moict_fresh_login', '1');
    setUser(u);
    return u;
  }

  async function logout() {
    localStorage.removeItem('moict_session');
    localStorage.removeItem('moict_works');
    localStorage.removeItem('moict_comments');
    localStorage.removeItem('moict_notifications');
    localStorage.removeItem('moict_documents');
    localStorage.removeItem('moict_doc_responses');
    sessionStorage.removeItem('moict_fresh_login');
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      const session = localStorage.getItem('moict_session');
      const fresh = sessionStorage.getItem('moict_fresh_login') === '1';
      if (session && fresh) {
        try {
          const me = await authService.me();
          setUser(me);
        } catch {
          await logout();
        }
      } else {
        localStorage.removeItem('moict_session');
        sessionStorage.removeItem('moict_fresh_login');
      }
      setLoading(false);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}