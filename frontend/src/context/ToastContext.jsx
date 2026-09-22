import { createContext, useCallback, useContext, useState } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info', durationMs = 5000) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast toast={toast} />
    </ToastContext.Provider>
  );
}