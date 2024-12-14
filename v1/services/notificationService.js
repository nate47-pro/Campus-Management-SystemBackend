const pool = require('../config/db');
const { sendEmail } = require('../utils/emailService');

class NotificationService {
  static async createNotification(userId, eventId, type, message) {
    try {
      const notification = await pool.query(
        'INSERT INTO notifications (user_id, event_id, type, message) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, eventId, type, message]
      );

      // Get user email
      const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      
      // Send email notification
      await sendEmail(user.rows[0].email, type, message);

      return notification.rows[0];
    } catch (error) {
      console.error('Notification creation error:', error);
      throw error;
    }
  }

  static async notifyEventUpdate(eventId, updates) {
    try {
      // Get all registered users for the event
      const registrations = await pool.query(
        'SELECT user_id FROM registrations WHERE event_id = $1 AND status = $2',
        [eventId, 'confirmed']
      );

      const event = await pool.query('SELECT title FROM events WHERE id = $1', [eventId]);
      const message = `Event "${event.rows[0].title}" has been updated. Changes: ${updates}`;

      // Create notifications for each registered user
      const notifications = registrations.rows.map(reg =>
        this.createNotification(reg.user_id, eventId, 'EVENT_UPDATE', message)
      );

      await Promise.all(notifications);
    } catch (error) {
      console.error('Event update notification error:', error);
      throw error;
    }
  }

  static async sendEventReminder(eventId) {
    try {
      // Get event details and registered users
      const event = await pool.query(`
        SELECT e.*, r.user_id 
        FROM events e
        JOIN registrations r ON e.id = r.event_id
        WHERE e.id = $1 AND r.status = 'confirmed'
      `, [eventId]);

      if (event.rows.length === 0) return;

      const message = `Reminder: Event "${event.rows[0].title}" is starting in 24 hours.`;

      // Create notifications for each registered user
      const notifications = event.rows.map(row =>
        this.createNotification(row.user_id, eventId, 'EVENT_REMINDER', message)
      );

      await Promise.all(notifications);
    } catch (error) {
      console.error('Event reminder notification error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService; 