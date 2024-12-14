const express = require('express')
const router = express.Router()
const { getEvents, getEventById } = require('../controllers/eventsController')

router.get('/getEvents', getEvents)
router.get('/getEventById/:id', getEventById)


module.exports = router;