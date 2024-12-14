const cron = require('node-cron');
const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

// Schedule event reminders to run every hour
cron.schedule('0 * * * *', async () => {
  try {
    // Get events starting in the next 24 hours
    const events = await pool.query(`
      SELECT id 
      FROM events 
      WHERE event_date BETWEEN NOW() + interval '23 hours' 
      AND NOW() + interval '24 hours'
    `);

    for (const event of events.rows) {
      await NotificationService.sendEventReminder(event.id);
    }
  } catch (error) {
    console.error('Reminder scheduler error:', error);
  }
}); 