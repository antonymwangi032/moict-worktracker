import { useCallback, useMemo, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Header from '../components/dashboard/Header';
import DocumentLibrary from '../components/dashboard/DocumentLibrary';
import UrgentBanner from '../components/dashboard/UrgentBanner';
import StatsGrid from '../components/dashboard/StatsGrid';
import WorkTable from '../components/dashboard/WorkTable';
import HistorySection from '../components/dashboard/HistorySection';

import WorkModal from '../components/modals/WorkModal';
import UserModal from '../components/modals/UserModal';
import UploadDocModal from '../components/modals/UploadDocModal';
import ViewDocModal from '../components/modals/ViewDocModal';
import SubmitWorkModal from '../components/modals/SubmitWorkModal';
import WorkDetailModal from '../components/modals/WorkDetailModal';
import AnalyticsModal from '../components/modals/AnalyticsModal';
import DocumentModal from '../components/modals/DocumentModal';
import DocResponseModal from '../components/modals/DocResponseModal';

import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useInactivityLogout } from '../hooks/useInactivityLogout';
import { computeStatus } from '../utils/dateUtils';

export default function DashboardPage() {
    const { user, isAdmin, logout } = useAuth();
    const {
        works, deleteWork, notifications, markAllRead, comments, deleteDocument
    } = useData();
    const { showToast } = useToast();

    const [filter, setFilter] = useState('all');
    const [highlighted, setHighlighted] = useState(null);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ name: null, payload: null });

    const open = (name, payload = null) => setModal({ name, payload });
    const close = () => setModal({ name: null, payload: null });

    useInactivityLogout({
        active: !!user,
        onLogout: async () => {
            await logout();
            showToast('Logged out due to 5 minutes of inactivity.', 'info');
        },
        onWarn: msg => showToast(msg, 'info')
    });

    const scoped = useMemo(
        () => (isAdmin ? works : works.filter(w => w.assignedTo === user?.id)),
        [works, isAdmin, user]
    );

    const counts = useMemo(() => {
        const live = scoped.map(w => ({ ...w, live: computeStatus(w) }));
        return {
            total: live.length,
            overdue: live.filter(w => w.live === 'Overdue').length,
            today: live.filter(w => w.live === 'Due Today').length,
            tomorrow: live.filter(w => w.live === 'Due Tomorrow').length,
            urgent: live.filter(w => w.live === 'Urgent' && !w.completed).length,
            approaching: live.filter(w => w.live === 'Approaching Deadline').length,
            completed: live.filter(w => w.completed).length,
            comments: comments.length
        };
    }, [scoped, comments]);

    const handleStatCardClick = useCallback((f) => {
        setHighlighted(f === 'all' ? null : f);
        setFilter(f === 'all' ? 'all' : f);
    }, []);

    const handleUrgentClick = useCallback(() => {
        const urgentCount = works.filter(w => computeStatus(w) === 'Urgent' && !w.completed).length;
        if (urgentCount === 0) {
            showToast('✅ No urgent tasks! All tasks are on track.', 'success');
            return;
        }
        setFilter('Urgent');
        setHighlighted(null);
        setTimeout(() => {
            document.querySelector('.card-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        showToast(`🔴 Showing ${urgentCount} urgent task(s)`, 'error');
    }, [works, showToast]);

    const handleBannerView = useCallback(() => {
        setFilter('Urgent');
        setHighlighted(null);
        setTimeout(() => {
            document.querySelector('.card-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }, []);

    const handleClear = useCallback(() => {
        setSearch('');
        setFilter('all');
        setHighlighted(null);
    }, []);

    const handleFilterSelect = useCallback((value) => {
        const next = value || 'all';
        setFilter(next);
        setHighlighted(null);
    }, []);

    async function handleAction(action, work) {
        switch (action) {
            case 'view': return open('detail', work);
            case 'edit': return open('work', work);
            case 'approve': return open('detail', work);
            case 'delete': {
                if (!confirm(`Delete "${work.title}"?`)) return;
                await deleteWork(work.id);
                showToast('🗑️ Work deleted.', 'success');
                return;
            }
            case 'viewDoc':
            case 'downloadDoc': return open('document', work);
            case 'submit': return open('submit', { work, isResubmit: false });
            case 'resubmit': return open('submit', { work, isResubmit: true });
            default: return;
        }
    }

    async function handleDeleteDocument(doc) {
        if (!confirm('Delete this document and all responses?')) return;
        try {
            await deleteDocument(doc.id);
            showToast('✅ Document deleted', 'success');
        } catch (e) {
            showToast('❌ ' + e.message, 'error');
        }
    }

    return (
        <DashboardLayout>
            <Header
                user={user}
                isAdmin={isAdmin}
                counts={counts}
                onUrgent={handleUrgentClick}
                onAnalytics={() => open('analytics')}
                onManageUsers={() => open('users')}
                onNewWork={() => open('work')}
                onUploadDoc={() => open('uploadDoc')}
                onLogout={logout}
                notifications={notifications}
                onMarkAllRead={markAllRead}
            />
            <DocumentLibrary
                onView={d => open('viewDoc', d)}
                onDownload={d => open('viewDoc', d)}
                onRespond={d => open('docResponse', d)}
                onDelete={handleDeleteDocument}
            />

            <UrgentBanner count={counts.urgent} onView={handleBannerView} />

            <StatsGrid
                counts={counts}
                activeFilter={highlighted}
                onFilter={handleStatCardClick}
            />

            <WorkTable
                works={works}
                isAdmin={isAdmin}
                currentUser={user}
                comments={comments}
                filter={filter}
                setFilter={handleFilterSelect}
                search={search}
                setSearch={setSearch}
                onClear={handleClear}
                onAction={handleAction}
            />

            {!isAdmin && (
                <HistorySection
                    works={works}
                    userId={user?.id}
                    onViewDoc={w => open('document', w)}
                />
            )}

            {modal.name === 'work' && <WorkModal work={modal.payload} onClose={close} />}
            {modal.name === 'users' && <UserModal onClose={close} />}
            {modal.name === 'uploadDoc' && <UploadDocModal onClose={close} />}
            {modal.name === 'viewDoc' && <ViewDocModal doc={modal.payload} onClose={close} />}
            {modal.name === 'submit' && <SubmitWorkModal {...modal.payload} onClose={close} />}
            {modal.name === 'detail' && <WorkDetailModal work={modal.payload} onClose={close} />}
            {modal.name === 'analytics' && <AnalyticsModal onClose={close} />}
            {modal.name === 'document' && <DocumentModal work={modal.payload} onClose={close} />}
            {modal.name === 'docResponse' && <DocResponseModal doc={modal.payload} onClose={close} />}
        </DashboardLayout>
    );
}