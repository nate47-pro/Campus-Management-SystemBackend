const router = require('express').Router();
const { auth } = require('../middleware/auth');
const pool = require('../config/db');

// Get user's notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await pool.query(`
      SELECT n.*, e.title as event_title
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `, [req.user.id]);

    res.json(notifications.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read',  async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (notification.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id',  async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (notification.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 