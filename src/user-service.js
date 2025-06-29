const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const { db, getUserByEmail, getUserByPhone } = require('../Firebase/firebase');
const auth = require('../utils/auth');
const { getResponseBody } = require('../utils/commonUtils');
const logger = require('../utils/logger');

const { sendVerificationEmail } = require('./mail-service');

module.exports.checkIsUserAlreadyExist = async (req, res, next) => {
    const { username, email, phoneNumber } = req.body;
    const userDoc = await db.collection('users').doc(username).get();
    let response = getResponseBody(403, '');

    if (userDoc.exists) {
        logger.warn('Registration failed - username already exists', { username }, req.requestId);
        response.message = 'username is already exist';
        return res.status(403).json(response);
    }

    const isMailExist = await getUserByEmail(email);

    if (isMailExist) {
        logger.warn('Registration failed - email already exists', { email }, req.requestId);
        response.message = 'Email is already exist';
        return res.status(403).json(response);
    }

    const isPhoneExist = await getUserByPhone(phoneNumber);

    if (isPhoneExist) {
        logger.warn('Registration failed - phone number already exists', { phoneNumber }, req.requestId);
        response.message = 'Number is already exist';
        return res.status(403).json(response);
    }

    logger.info('User validation passed', { username, email }, req.requestId);
    next();
}

module.exports.registerUser = async (req, res) => {
    const { 
        username, 
        email,
        fName,
        lName,
        password, 
        phoneNumber
    } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = auth.generateOtp()

        await db.collection('users').doc(username).set({
            fName,
            lName,
            username,
            email,
            phoneNumber,
            password: hashedPassword,
            verified: false,
            verificationToken: otp,
            createdAt: admin.firestore.Timestamp.now()
        });

        await sendVerificationEmail(email, otp)

        logger.info('User registered successfully', { username, email }, req.requestId);
        res.status(201).json({ message: "Done" });
    } catch (error) {
        logger.error('Registration failed', error, req.requestId);
        res.status(500).json({ error: error.message });
    }
};

module.exports.verifyEmailAndPhone = async (req, res) => {
    const { otp } = req.body;

    try {
        const userQuery = await db.collection('users').where('verificationToken', '==', otp).get();

        if (userQuery.empty) {
            logger.warn('Email verification failed - invalid token', { otp }, req.requestId);
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const userDoc = userQuery.docs[0];
        const user = userDoc.data();

        await db.collection('users').doc(userDoc.id).update({
            verified: true,
            verificationToken: null
        });

        logger.info('Email verified successfully', { email: user.email }, req.requestId);
        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        logger.error('Email verification failed', error, req.requestId);
        res.status(500).json({ error: error.message });
    }
};

module.exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Debug: Log what we're receiving
        logger.debug('Login attempt', { username, hasPassword: !!password }, req.requestId);
        
        // Check if username is empty or invalid
        if (!username || typeof username !== 'string' || username.trim() === '') {
            logger.warn('Login failed - empty or invalid username parameter', { username }, req.requestId);
            return res.status(400).json({ error: 'Username parameter is required' });
        }

        let userDoc;
        const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(username);

        if (isEmail) {
            logger.debug('Attempting login with email', { email: username }, req.requestId);
            const userQuery = await db.collection('users').where('email', '==', username).get();
            if (userQuery.empty) {
                logger.warn('Login failed - user not found by email', { email: username }, req.requestId);
                return res.status(404).json({ error: 'User not found Pleaser Register' });
            }
            userDoc = userQuery.docs[0];
        } else {
            logger.debug('Attempting login with username', { username: username }, req.requestId);
            userDoc = await db.collection('users').doc(username).get();
            if (!userDoc.exists) {
                logger.warn('Login failed - user not found by username', { username: username }, req.requestId);
                return res.status(404).json({ error: 'User not found Pleaser Register' });
            }
        }

        const user = userDoc.data();

        if (!user.verified) {
            logger.warn('Login failed - email not verified', { username }, req.requestId);
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn('Login failed - invalid password', { username }, req.requestId);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET_KEY);

        logger.info('Login successful', { username: user.username }, req.requestId);
        res.status(200).json(getResponseBody(200, 'logged in', { token }));
    } catch (error) {
        logger.error('Login failed', error, req.requestId);
        res.status(500).json({ error: error.message });
    }
};

module.exports.getUserData = async (req, res) => {
    try {
        const userName = req.user.username;
        const userDoc = await db.collection('users').doc(userName).get();

        if (!userDoc.exists) {
            logger.warn('User profile not found', { username: userName }, req.requestId);
            return res.status(404).json({ error: 'User not found Pleaser Register' });
        }
        const userData = userDoc.data();
        logger.info('User profile retrieved', { username: userName }, req.requestId);
        res.status(200).json(userData);
    } catch (e) {
        logger.error('Failed to get user profile', e, req.requestId);
        res.status(500).send('Error fetching data: ' + e.message);
    }
}
