require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const functions = require('firebase-functions');
const cors = require('cors');
const app = express()

const newsfeedRoutes = require('./src/newsfeed-routes');
const logger = require('./utils/logger');
const ResponseHandler = require('./utils/responseHandler');
const userRoutes = require('./src/user-routes');
const authRoutes = require('./src/auth-routes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Use custom logger for request logging
app.use((req, res, next) => logger.logRequest(req, res, next));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  logger.info('Health check requested', null, req.requestId);
  return ResponseHandler.success(res, { timestamp: new Date().toISOString() }, 'Service is healthy');
});

app.use('/newsfeed', newsfeedRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);

// Error logging middleware (should be last)
app.use((error, req, res, next) => logger.logError(error, req, res, next));

exports.app = functions.https.onRequest(app);

// Only start the server if not in Firebase Functions environment
if (process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_FUNCTIONS) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    logger.info(`Server started successfully`, { port: PORT });
  });
}
