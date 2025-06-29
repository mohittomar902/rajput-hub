const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const { db, getUserByEmail, getUserByPhone } = require('../Firebase/firebase');
const auth = require('../utils/auth');
const logger = require('../utils/logger');
const { mapdbData } = require('../utils/commonUtils');
const ResponseHandler = require('../utils/responseHandler');

const { sendVerificationEmail } = require('./mail-service');

module.exports.checkIsUserAlreadyExist = async (req, res, next) => {
    const { username, email, phoneNumber } = req.body;
    const userDoc = await db.collection('users').doc(username).get();

    if (userDoc.exists) {
        logger.warn('Registration failed - username already exists', { username }, req.requestId);
        return ResponseHandler.conflict(res, 'Username is already exist');
    }

    const isMailExist = await getUserByEmail(email);

    if (isMailExist) {
        logger.warn('Registration failed - email already exists', { email }, req.requestId);
        return ResponseHandler.conflict(res, 'Email is already exist');
    }

    const isPhoneExist = await getUserByPhone(phoneNumber);

    if (isPhoneExist) {
        logger.warn('Registration failed - phone number already exists', { phoneNumber }, req.requestId);
        return ResponseHandler.conflict(res, 'Phone number is already exist');
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
        return ResponseHandler.success(res, null, 'Registration successful! Please check your email for verification.', 201);
    } catch (error) {
        logger.error('Registration failed', error, req.requestId);
        return ResponseHandler.error(res, error.message);
    }
};

module.exports.verifyEmailAndPhone = async (req, res) => {
    const { verificationTokens } = req.body;

    try {
        // Check if verificationTokens is an array
        if (!Array.isArray(verificationTokens) || verificationTokens.length === 0) {
            logger.warn('User verification failed - invalid tokens array', { verificationTokens }, req.requestId);
            return ResponseHandler.badRequest(res, 'Invalid tokens array. Please provide an array of verification tokens.');
        }

        const batch = db.batch();
        const verifiedUsers = [];
        const invalidTokens = [];

        // Process each token
        for (const token of verificationTokens) {
            try {
                const userQuery = await db.collection('users').where('verificationToken', '==', token).get();

                if (userQuery.empty) {
                    invalidTokens.push(token);
                    logger.warn('Email verification failed - invalid token', { token }, req.requestId);
                    continue;
                }

                const userDoc = userQuery.docs[0];
                const user = userDoc.data();

                // Add update operation to batch
                const userRef = db.collection('users').doc(userDoc.id);
                batch.update(userRef, {
                    verified: true,
                    verificationToken: null
                });

                verifiedUsers.push({
                    username: user.username,
                    email: user.email
                });

                logger.info('User queued for verification', { username: user.username, email: user.email }, req.requestId);
            } catch (error) {
                logger.error('Error processing token', { token, error: error.message }, req.requestId);
                invalidTokens.push(token);
            }
        }

        // Commit the batch if there are valid tokens
        if (verifiedUsers.length > 0) {
            await batch.commit();
            logger.info('Batch verification completed', { 
                verifiedCount: verifiedUsers.length, 
                invalidCount: invalidTokens.length 
            }, req.requestId);
        }

        // Prepare response
        const response = {
            verifiedUsers,
            invalidTokens,
            summary: {
                totalProcessed: verificationTokens.length,
                successfullyVerified: verifiedUsers.length,
                failedVerifications: invalidTokens.length
            }
        };

        if (verifiedUsers.length > 0) {
            return ResponseHandler.success(res, response, 
                `Successfully verified ${verifiedUsers.length} user(s). ${invalidTokens.length > 0 ? `${invalidTokens.length} token(s) were invalid.` : ''}`
            );
        } else {
            return ResponseHandler.badRequest(res, 'No valid tokens found. All provided tokens were invalid or expired.');
        }

    } catch (error) {
        logger.error('User verification failed', error, req.requestId);
        return ResponseHandler.error(res, error.message);
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
            return ResponseHandler.badRequest(res, 'Username parameter is required');
        }

        let userDoc;
        const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(username);

        if (isEmail) {
            logger.debug('Attempting login with email', { email: username }, req.requestId);
            const userQuery = await db.collection('users').where('email', '==', username).get();
            if (userQuery.empty) {
                logger.warn('Login failed - user not found by email', { email: username }, req.requestId);
                return ResponseHandler.notFound(res, 'User not found. Please register.');
            }
            userDoc = userQuery.docs[0];
        } else {
            logger.debug('Attempting login with username', { username: username }, req.requestId);
            userDoc = await db.collection('users').doc(username).get();
            if (!userDoc.exists) {
                logger.warn('Login failed - user not found by username', { username: username }, req.requestId);
                return ResponseHandler.notFound(res, 'User not found. Please register.');
            }
        }

        const user = userDoc.data();

        if (!user.verified) {
            logger.warn('Login failed - email not verified', { username }, req.requestId);
            return ResponseHandler.forbidden(res, 'Please verify your email before logging in');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn('Login failed - invalid password', { username }, req.requestId);
            return ResponseHandler.unauthorized(res, 'Invalid credentials');
        }

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET_KEY);

        logger.info('Login successful', { username: user.username }, req.requestId);
        return ResponseHandler.success(res, { token }, 'Login successful');
    } catch (error) {
        logger.error('Login failed', error, req.requestId);
        return ResponseHandler.error(res, error.message);
    }
};

module.exports.getUserData = async (req, res) => {
    try {
        const userName = req.user.username;
        const userDoc = await db.collection('users').doc(userName).get();

        if (!userDoc.exists) {
            logger.warn('User profile not found', { username: userName }, req.requestId);
            return ResponseHandler.notFound(res, 'User not found. Please register.');
        }
        const userData = userDoc.data();
        logger.info('User profile retrieved', { username: userName }, req.requestId);
        return ResponseHandler.success(res, userData, 'User profile retrieved successfully');
    } catch (e) {
        logger.error('Failed to get user profile', e, req.requestId);
        return ResponseHandler.error(res, 'Error fetching data: ' + e.message);
    }
}

module.exports.getUnverifiedUser = async (req, res) => {
    try {
        const pendingUsers = await db.collection('users').where('verified', '==', false).get();
        let sanitizedUsers;
        if (pendingUsers) {
            sanitizedUsers = mapdbData(pendingUsers)
            if (sanitizedUsers) {
                sanitizedUsers = sanitizedUsers?.map(({ password, ...rest }) => rest);
            }
        }
        logger.info('Unverified users retrieved', { users: sanitizedUsers }, req.requestId);
        return ResponseHandler.success(res, sanitizedUsers, 'Unverified users retrieved successfully');
    } catch (e) {
        logger.error('Failed to get unverified users', e, req.requestId);
        return ResponseHandler.error(res, 'Error fetching data: ' + e.message);
    }
}
