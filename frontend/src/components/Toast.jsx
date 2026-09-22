export default function Toast({ toast }) {
  if (!toast) return <div className="toast" />;
  const cls = ['toast', 'show', toast.type].filter(Boolean).join(' ');
  return <div className={cls}>{toast.message}</div>;
}