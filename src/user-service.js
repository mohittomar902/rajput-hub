const bcrypt = require('bcrypt');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const { db, getUserByEmail, getUserByPhone } = require('../Firebase/firebase');
const auth = require('../utils/auth');
const { getResponseBody } = require('../utils/commonUtils');

const { sendVerificationEmail } = require('./mail-service');

module.exports.checkIsUserAlreadyExist = async (req, res, next) => {
    const { username, email, phoneNumber } = req.body;
    const userDoc = await db.collection('users').doc(username).get();
    let response = getResponseBody(403, '');

    if (userDoc.exists) {
        response.message = 'username is already exist';
        return res.status(403).json(response);
    }

    const isMailExist = await getUserByEmail(email);

    if (isMailExist) {
        response.message = 'Email is already exist';
        return res.status(403).json(response);
    }

    const isPhoneExist = await getUserByPhone(phoneNumber);

    if (isPhoneExist) {
        response.message = 'Number is already exist';
        return res.status(403).json(response);
    }

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

        res.status(201).json({ message: "Done" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.verifyEmailAndPhone = async (req, res) => {
    const { otp } = req.body;

    try {
        const userQuery = await db.collection('users').where('verificationToken', '==', otp).get();

        if (userQuery.empty) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const userDoc = userQuery.docs[0];
        const user = userDoc.data();

        await db.collection('users').doc(user.email).update({
            verified: true,
            verificationToken: null
        });

        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userDoc = await db.collection('users').doc(email).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found Pleaser Register' });
        }

        const user = userDoc.data();

        if (!user.verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET_KEY);

        res.status(200).json(getResponseBody(200, 'logged in', { token }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.getUserData = async (req, res) => {
    try {
        const userName = req.user.username;
        const userDoc = await db.collection('users').doc(userName).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found Pleaser Register' });
        }
        const userData = userDoc.data();
        res.status(200).json(userData);
    } catch (e) {
        res.status(500).send('Error fetching data: ' + e.message);
    }
}
