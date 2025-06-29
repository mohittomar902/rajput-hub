const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../Firebase/firebase');

module.exports.authenticateToken = (req, res, next) => {
    if (!req.headers || !req.headers.authorization) {
        return res.status(401).send({ error: 'Access denied. No token provided.' });
    }

    const token = req?.headers?.authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        console.error(req.requestId, err);
        res.status(400).send({ error: 'Invalid token.', err });
    }
}

module.exports.verifyAdmin = async (req, res, next) => {
    try {
        const userName = req.user.username;
        const userDoc = await db.collection('users').doc(userName).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();
        
        if (!userData.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        res.status(500).json({ error: 'Internal server error during admin verification.' });
    }
}

module.exports.generateOtp = () => {
    const otp = crypto.randomInt(100000, 1000000);
    return otp.toString();
}
