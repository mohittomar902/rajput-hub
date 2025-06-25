const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'smtp.gmail.com',
    host: 'smtp.gmail.com',
    Authentication: 'Yes',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports.sendVerificationEmail = async (email, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        html: `<h1>Welcome to the Rajput Hub</h1>
               <p>Please Enter OTP: ${verificationCode}</p>`
    };

    await transporter.sendMail(mailOptions);
};
