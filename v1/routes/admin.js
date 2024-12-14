const router = require('express').Router();
const pool = require('../config/db');

// Dashboard Overview Statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM events WHERE event_date >= CURRENT_DATE) as upcoming_events,
        (SELECT COUNT(*) FROM registrations WHERE status = 'confirmed') as total_registrations,
        (SELECT COUNT(*) FROM venues) as total_venues,
        (SELECT COUNT(*) FROM events WHERE event_date < CURRENT_DATE) as past_events,
        (SELECT ROUND(AVG(average_rating), 2) FROM events WHERE average_rating IS NOT NULL) as average_event_rating
    `);

    // Get user distribution by role
    const userRoles = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);

    // Get event distribution by category
    const eventCategories = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM events 
      GROUP BY category
    `);

    res.json({
      overview: stats.rows[0],
      userRoles: userRoles.rows,
      eventCategories: eventCategories.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Management
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, role, created_at,
      (SELECT COUNT(*) FROM registrations WHERE user_id = users.id) as total_registrations
      FROM users
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      query += ` AND email ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      query += ` AND role = $${paramCount}`;
      queryParams.push(role);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const users = await pool.query(query, queryParams);
    const total = await pool.query('SELECT COUNT(*) FROM users');

    res.json({
      users: users.rows,
      total: parseInt(total.rows[0].count),
      pages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Event Management
router.get('/events/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analytics = await pool.query(`
      SELECT 
        e.id,
        e.title,
        e.category,
        e.event_date,
        COUNT(r.id) as registration_count,
        e.max_participants,
        e.average_rating,
        (SELECT COUNT(*) FROM feedback WHERE event_id = e.id) as feedback_count
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
      WHERE e.event_date BETWEEN $1 AND $2
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `, [startDate || '1900-01-01', endDate || '2100-12-31']);

    res.json(analytics.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Venue Analytics
router.get('/venues/analytics', async (req, res) => {
  try {
    const venueUsage = await pool.query(`
      SELECT 
        v.id,
        v.name,
        COUNT(e.id) as total_events,
        ROUND(AVG(e.max_participants::float / v.capacity * 100), 2) as avg_capacity_utilization,
        COUNT(DISTINCT e.organizer_id) as unique_organizers
      FROM venues v
      LEFT JOIN events e ON v.id = e.venue_id
      GROUP BY v.id, v.name
      ORDER BY total_events DESC
    `);

    res.json(venueUsage.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Registration Analytics
router.get('/registrations/analytics', async (req, res) => {
  try {
    const registrationStats = await pool.query(`
      SELECT 
        DATE_TRUNC('month', r.registration_date) as month,
        COUNT(*) as total_registrations,
        COUNT(DISTINCT r.user_id) as unique_users,
        COUNT(DISTINCT r.event_id) as unique_events,
        COUNT(*) FILTER (WHERE r.status = 'confirmed') as confirmed_registrations,
        COUNT(*) FILTER (WHERE r.status = 'waitlist') as waitlist_registrations
      FROM registrations r
      GROUP BY DATE_TRUNC('month', r.registration_date)
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json(registrationStats.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// System Logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM system_logs
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (type) {
      query += ` AND log_type = $${paramCount}`;
      queryParams.push(type);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const logs = await pool.query(query, queryParams);
    res.json(logs.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 