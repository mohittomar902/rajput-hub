require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const functions = require('firebase-functions');
const cors = require('cors');
const app = express()

const userService = require('./src/user-service');
const { authenticateToken } = require('./utils/auth');
const { userRequiredParameters, loginRequiredParameters } = require('./utils/constant');
const { getdataValidationMiddleware } = require('./utils/dataValidation');
const newsfeedRoutes = require('./src/newsfeed-routes');
const logger = require('./utils/logger');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Use custom logger for request logging
app.use((req, res, next) => logger.logRequest(req, res, next));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  logger.info('Health check requested', null, req.requestId);
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/login',getdataValidationMiddleware(loginRequiredParameters), (req, res, next) => {
  logger.debug('Login request body', { body: req.body }, req.requestId);
  userService.login(req, res, next);
});

app.post('/register',
  getdataValidationMiddleware(userRequiredParameters),
  userService.checkIsUserAlreadyExist,
  userService.registerUser
);

app.post('/verifyUser', userService.verifyEmailAndPhone);

app.get('/get-user-profile', authenticateToken, userService.getUserData)

app.use('/newsfeed', newsfeedRoutes);

// Error logging middleware (should be last)
app.use((error, req, res, next) => logger.logError(error, req, res, next));

exports.app = functions.https.onRequest(app);

// Only start the server if not in Firebase Functions environment
if (process.env.NODE_ENV !== 'production' || !process.env.FIREBASE_FUNCTIONS) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server started successfully`, { port: PORT });
  });
}
