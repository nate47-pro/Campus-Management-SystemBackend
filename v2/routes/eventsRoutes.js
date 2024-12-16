const express = require('express')
const router = express.Router()
const { getEvents, getEventById, registerForEvent } = require('../controllers/eventsController')

router.get('/getEvents', getEvents)
router.get('/getEventById/:id', getEventById)
router.post('/rsvp', registerForEvent)



module.exports = router;