// Middleware functions go here

// Example: Request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

module.exports = {
  requestLogger,
};
