const { checkVenueConflicts } = require('../utils/venueUtils');

const validateVenueAvailability = async (req, res, next) => {
  try {
    const { venue_id, event_date, duration } = req.body;
    
    if (!venue_id || !event_date || !duration) {
      return next();
    }

    const hasConflict = await checkVenueConflicts(
      venue_id,
      new Date(event_date),
      duration
    );

    if (hasConflict) {
      return res.status(400).json({ 
        message: 'Venue is not available for the selected time period' 
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { validateVenueAvailability }; 