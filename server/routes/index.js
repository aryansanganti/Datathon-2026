const express = require('express');
const router = express.Router();

// Import route files here
// const userRoutes = require('./users');

// Use routes
// router.use('/users', userRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'Server is healthy' });
});

module.exports = router;
