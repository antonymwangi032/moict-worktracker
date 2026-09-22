import { todayStr } from './dateUtils';

export function validateDates({ received, assigned, due }) {
  const today = todayStr();
  if (received && received > today) return 'Date Received cannot be in the future';
  if (assigned && assigned > today) return 'Date Assigned cannot be in the future';
  if (due && due < today) return 'Due Date cannot be in the past';
  if (received && assigned && received > assigned) return 'Date Received cannot be after Date Assigned';
  if (assigned && due && assigned > due) return 'Date Assigned cannot be after Due Date';
  if (received && due && received > due) return 'Date Received cannot be after Due Date';
  return null;
}