import {
  createContext, useCallback, useContext, useEffect, useMemo, useState
} from 'react';
import { useAuth } from './AuthContext';
import { worksService } from '../services/worksService';
import { commentsService } from '../services/commentsService';
import { notificationsService } from '../services/notificationsService';
import { documentsService } from '../services/documentsService';

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const { user } = useAuth();

  const [works, setWorks] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docResponses, setDocResponses] = useState([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [w, n, d] = await Promise.all([
          worksService.list(),
          notificationsService.list(),
          documentsService.list()
        ]);
        setWorks(w);
        setNotifications(n);
        setDocuments(d);
      } catch (e) {
        console.error('Initial data load failed:', e);
      }
    })();
  }, [user]);

  const createWork = useCallback(async (payload) => {
    const created = await worksService.create(payload);
    setWorks(prev => [created, ...prev]);
    return created;
  }, []);

  const updateWork = useCallback(async (id, payload) => {
    const updated = await worksService.update(id, payload);
    setWorks(prev => prev.map(w => w.id === updated.id ? updated : w));
    return updated;
  }, []);

  const setWorkState = useCallback(async (id, payload) => {
    const updated = await worksService.setState(id, payload);
    setWorks(prev => prev.map(w => w.id === updated.id ? updated : w));
    return updated;
  }, []);

  const deleteWork = useCallback(async (id) => {
    await worksService.remove(id);
    setWorks(prev => prev.filter(w => w.id !== id));
  }, []);

  const attachWorkFile = useCallback(async (id, file) => {
    const updated = await worksService.uploadFile(id, file);
    setWorks(prev => prev.map(w => w.id === updated.id ? { ...w, ...updated } : w));
    return updated;
  }, []);

  const loadCommentsForWork = useCallback(async (workId) => {
    const list = await commentsService.listForWork(workId);
    setComments(prev => {
      const others = prev.filter(c => c.workId !== workId);
      return [...others, ...list];
    });
    return list;
  }, []);

  const addComment = useCallback(async (payload) => {
    const created = await commentsService.add(payload);
    setComments(prev => [...prev, created]);
    return created;
  }, []);

  const addNotification = useCallback((title, description, type, workId) => {
    const n = {
      id: Date.now(),
      title, description, type, workId: workId || null,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [n, ...prev].slice(0, 50));
    notificationsService.create({ title, description, type, workId }).catch(() => { });
    return n;
  }, []);

  const markAllRead = useCallback(async () => {
    try { await notificationsService.markAllRead(); } catch { }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const uploadDocument = useCallback(async (payload) => {
    const doc = await documentsService.upload(payload);
    setDocuments(prev => [doc, ...prev]);
    return doc;
  }, []);

  const deleteDocument = useCallback(async (id) => {
    await documentsService.remove(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    setDocResponses(prev => prev.filter(r => r.docId !== id));
  }, []);

  const loadResponsesFor = useCallback(async (docId) => {
    const list = await documentsService.responses(docId);
    setDocResponses(prev => {
      const others = prev.filter(r => r.docId !== docId);
      return [...others, ...list];
    });
    return list;
  }, []);

  const addDocResponse = useCallback(async (payload) => {
    const r = await documentsService.addResponse(payload);
    setDocResponses(prev => [...prev, r]);
    return r;
  }, []);

  const value = useMemo(() => ({
    works, setWorks, createWork, updateWork, setWorkState, deleteWork, attachWorkFile,
    comments, setComments, loadCommentsForWork, addComment,
    notifications, setNotifications, addNotification, markAllRead,
    documents, setDocuments, uploadDocument, deleteDocument,
    docResponses, setDocResponses, loadResponsesFor, addDocResponse,

  }), [
    works, comments, notifications, documents, docResponses,
    createWork, updateWork, setWorkState, deleteWork, attachWorkFile,
    loadCommentsForWork, addComment, addNotification, markAllRead,
    uploadDocument, deleteDocument, loadResponsesFor, addDocResponse,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}