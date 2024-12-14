const pool = require('../config/DB')

const getEvents = async (req, res) => {
    const events = await pool.query('SELECT * FROM events');
    res.json(events.rows);
}

const getEventById = async (req, res) => {
    const { id } = req.params;
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    res.json(event.rows[0]);
}

module.exports = {
    getEvents,
    getEventById
}