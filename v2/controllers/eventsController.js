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
    const userId = req.params.id; // Assuming you have user info in req.user from authentication
    console.log(`User:${userId}`)
    try {
        
        const query = `
        SELECT 
            rsvps.id AS rsvp_id,
            rsvps.status,
            rsvps.created_at AS rsvp_created_at,
            events.id AS event_id,
            events.name,
            events.description,
            events.event_date,
            events.event_time,
            events.location,
            events.capacity,
            events.available_seats,
            events.type,
            events.created_by,
            events.created_at AS event_created_at
        FROM 
            rsvps
        INNER JOIN 
            events 
        ON 
            rsvps.event_id = events.id
        WHERE 
            rsvps.user_id = $1
    `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching user events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

}

const createEvent = async (req, res) => {
    let {
      name,
      description,
      event_date,
      event_time,
      capacity,
      location,
      type,
      created_by,
    } = req.body;
    console.log(
      `name: ${name} || description: ${description} || event_date: ${event_date} || event_time: ${event_time} || capacity: ${capacity} || location: ${location} || type: ${type} || created_by: ${created_by}`
    );
    if (
      !name ||
      !description ||
      !event_date ||
      !event_time ||
      !capacity ||
      !location ||
      !type ||
      !created_by
    ) {
      console.log("All fields are required");
      return res.status(400).json({ message: "All fields are required" });
    }
    try {
      capacity = parseInt(capacity);
      available_seats = parseInt(available_seats);
      await pool.query(
        "INSERT INTO events (name, description, event_date, event_time, capacity, location, type, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
        [
          name,
          description,
          event_date,
          event_time,
          capacity,
          location,
          type,
          created_by,
        ]
      );
      console.log("Event created successfully");
      return res.status(201).json({ message: "Event created successfully" });
    } catch (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Error creating event" });
    }
  };

module.exports = {
    getEvents,
    getEventById,
    registerForEvent,
    getAUserRsvp,
    createEvent
}