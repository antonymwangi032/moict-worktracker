import 'express-async-errors';
import { app } from './app.js';
import 'dotenv/config';
import cron from 'node-cron';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ MoICT WorkTracker backend running on http://localhost:${PORT}`);
});

// Run every day at 08:00 (server local time)
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ [CRON] Checking for work due tomorrow…');
  try {
    const res = await fetch(`http://localhost:${PORT}/api/works/cron/send-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    console.log(`⏰ [CRON] Reminders: sent ${data.sent} of ${data.checked} candidate(s)`);
  } catch (e) {
    console.error('⏰ [CRON] Failed:', e.message);
  }
});