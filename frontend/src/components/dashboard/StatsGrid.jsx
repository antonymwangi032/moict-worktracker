export default function UrgentBanner({ count, onView }) {
  if (count === 0) return null;
  return (
    <div className="urgent-banner show">
      <div className="urgent-text">
        <span style={{ fontSize: '1.5rem' }}>🚨</span>
        <span className="urgent-count">{count}</span>
        <span>urgent task(s) require immediate attention!</span>
      </div>
      <button className="btn-view-urgent" onClick={onView}>
        <i className="fas fa-arrow-right" /> View Urgent
      </button>
    </div>
  );
}