const express = require('express')
const router = express.Router()
const { getEvents, getEventById, registerForEvent,getAUserRsvp, createEvent } = require('../controllers/eventsController')

router.get('/getEvents', getEvents)
router.get('/getEventId/:id', getEventById)
router.post('/rsvp', registerForEvent)
router.get("/getAUserRsvp/:id", getAUserRsvp)
router.post("/createEvents",createEvent)



module.exports = router;