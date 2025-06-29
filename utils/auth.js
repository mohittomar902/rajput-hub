const crypto = require('crypto');

const jwt = require('jsonwebtoken');

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

module.exports.generateOtp = () => {
    const otp = crypto.randomInt(100000, 1000000);
    return otp.toString();
}
