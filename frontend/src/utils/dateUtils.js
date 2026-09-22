export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function formatDateDisplay(d) {
  if (!d) return 'Not set';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(d) {
  if (!d) return 'Not set';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function computeStatus(work) {
  if (work.completed) return 'Completed';
  if (work.rejected) return 'Rejected';
  if (work.returned) return 'Returned';
  if (work.resubmitted) return 'Resubmitted';
  if (work.inReview) return 'In Review';
  if (work.submitted) return 'Submitted';

  const due = work.dueDate;
  if (!due) return 'Pending';

  const today = todayStr();
  const diffDays = Math.ceil((new Date(due) - new Date(today)) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Due Tomorrow';
  if (diffDays <= 3) return 'Urgent';
  if (diffDays <= 5) return 'Approaching Deadline';
  return 'Pending';
}