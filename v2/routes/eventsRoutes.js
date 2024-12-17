const express = require('express')
const router = express.Router()
const { getEvents, getEventById, registerForEvent,getAUserRsvp } = require('../controllers/eventsController')

router.get('/getEvents', getEvents)
router.get('/getEventId/:id', getEventById)
router.post('/rsvp', registerForEvent)
router.get("/getAUserRsvp/:id", getAUserRsvp)



module.exports = router;