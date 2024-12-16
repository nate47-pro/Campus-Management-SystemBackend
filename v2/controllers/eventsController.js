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
const registerForEvent = async (req, res) => {
    const { event_id, user_id } = req.body;
    console.log(`event_id: ${event_id}, user_id: ${user_id}`);
    try {
        const event = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
        if(event.rows.capacity === 0){
            console.log("Event id full")
            return res.status(400).json({message: "Event is full"});
        }

        const existingRsvp = await pool.query('SELECT * FROM rsvps WHERE event_id = $1 AND user_id = $2', [event_id, user_id]);
        if(existingRsvp.rows.length > 0){
            console.log("User already registered for this event")
            return res.status(400).json({message: "User already registered for this event"});
        }

        await pool.query('INSERT INTO rsvps (event_id, user_id) VALUES ($1, $2)', [event_id, user_id]);
        await pool.query('UPDATE events SET capacity = capacity - 1 WHERE id = $1', [event_id]);
        console.log("User registered successfully")
        return res.status(200).json({message: "User registered successfully"});
    } catch(error) {
        console.log("Error:",error)
        return res.status(500).json({message: "Error registering for event"});
    }
};

const getAUserRsvp = async (req,res) =>{
    try {
        const userId = req.user.id; // Assuming you have user info in req.user from authentication
        
        const query = `
            SELECT e.*, r.rsvp_status
            FROM events e
            INNER JOIN rsvp r ON e.event_id = r.event_id
            WHERE r.user_id = $1
            ORDER BY e.event_date DESC
        `;
        
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

}

module.exports = {
    getEvents,
    getEventById,
    registerForEvent
}