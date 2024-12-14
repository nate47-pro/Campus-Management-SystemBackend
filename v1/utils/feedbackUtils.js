const pool = require('../config/db');

async function getFeedbackSummary(eventId) {
  try {
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 2) as average_rating,
        JSON_BUILD_OBJECT(
          '5', COUNT(*) FILTER (WHERE rating = 5),
          '4', COUNT(*) FILTER (WHERE rating = 4),
          '3', COUNT(*) FILTER (WHERE rating = 3),
          '2', COUNT(*) FILTER (WHERE rating = 2),
          '1', COUNT(*) FILTER (WHERE rating = 1)
        ) as rating_distribution
      FROM feedback
      WHERE event_id = $1
    `, [eventId]);

    return summary.rows[0];
  } catch (error) {
    console.error('Error getting feedback summary:', error);
    throw error;
  }
}

async function getRecentFeedback(eventId, limit = 5) {
  try {
    const recentFeedback = await pool.query(`
      SELECT f.*, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.event_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2
    `, [eventId, limit]);

    return recentFeedback.rows;
  } catch (error) {
    console.error('Error getting recent feedback:', error);
    throw error;
  }
}

module.exports = {
  getFeedbackSummary,
  getRecentFeedback
}; 