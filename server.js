require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const functions = require('firebase-functions');
const app = express()

const userService = require('./src/user-service');
const { authenticateToken } = require('./utils/auth');
const { userRequiredParameters } = require('./utils/constant');
const { getdataValidationMiddleware } = require('./utils/dataValidation');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/login', userService.login);

app.post('/register',
  getdataValidationMiddleware(userRequiredParameters),
  userService.checkIsUserAlreadyExist,
  userService.registerUser
);

app.post('/verifyUser', userService.verifyEmailAndPhone);

app.get('/get-user-profile', authenticateToken, userService.getUserData)

exports.app = functions.https.onRequest(app);