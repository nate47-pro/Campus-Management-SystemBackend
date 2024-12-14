const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Your frontend URL
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/auth', require('./v1/routes/auth'));
app.use('/api/v1/events', require('./v1/routes/events'));

app.use('/api/v2/auth', require('./v2/routes/authRoutes'));
app.use('/api/v2/events', require('./v2/routes/eventsRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});  