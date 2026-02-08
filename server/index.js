const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();
const db = require('./config/db');
require('./config/passport');

const passport = require('passport');
const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.JWT_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api', require('./routes/index'));

// Daily sync (e.g. 2 AM) - GitHub commits
const cron = require('node-cron');
const { runIngestion } = require('./services/ingestion');
const config = require('./config/env');
cron.schedule('0 2 * * *', () => {
  const repo = config.GITHUB_DEFAULT_REPO;
  if (repo) {
    runIngestion(repo).catch((err) => console.error('Scheduled ingestion failed:', err));
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MERN Server' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
