const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const smtpTransport = require("nodemailer-smtp-transport");
require("dotenv").config();

const User = require("../models/user");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const USERMAIL = process.env.USERMAIL;
const PASS = process.env.PASS;

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const ACCESS_TOKEN = oAuth2Client.getAccessToken();

const transporter = nodemailer.createTransport(
    smtpTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            type: "OAuth2",
            user: USERMAIL,
            pass: PASS,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: ACCESS_TOKEN,
            expires: 43200,
        },
    })
);

exports.getLogin = (req, res, next) => {
    let message = req.flash("error");
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render("auth/login", {
        path: "/login",
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors: [],
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    const errorMessage = errors.array();

    console.log(errorMessage[0]);
    if (!errors.isEmpty()) {
        return res.status(422).render("auth/login", {
            path: "/login",
            errorMessage: errorMessage[0].msg,
            oldInput: {
                email: email,
                password: password,
            },
            validationErrors: errorMessage,
        });
    }

    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                return res.status(422).render("auth/login", {
                    path: "/login",
                    errorMessage: "Invalid email or password!",
                    oldInput: {
                        email: email,
                        password: password,
                    },
                    validationErrors: [{ path: "email" }, { path: "password" }],
                });
            }
            bcrypt
                .compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect("/");
                        });
                    }
                    return res.status(422).render("auth/login", {
                        path: "/login",
                        errorMessage: "Invalid email or password!",
                        oldInput: {
                            email: email,
                            password: password,
                        },
                        validationErrors: [
                            { path: "email" },
                            { path: "password" },
                        ],
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.redirect("/login");
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect("/");
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash("error");
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render("auth/signup", {
        path: "/signup",
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
            confirmPassword: "",
        },
        validationErrors: [],
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const errors = validationResult(req);
    const errorMessage = errors.array();

    console.log(errorMessage);
    if (!errors.isEmpty()) {
        return res.status(422).render("auth/signup", {
            path: "/signup",
            errorMessage: errorMessage[0].msg,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword,
            },
            validationErrors: errorMessage,
        });
    }

    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
                cart: { items: [] },
            });
            return user.save();
        })
        .then(result => {
            res.redirect("/login");
            return transporter.sendMail({
                from: "datz0512shop@gmail.com",
                to: email,
                subject: "Signup succeeded!",
                html: "<h1>You have Successfully Signed Up!</h1>",
            });
        })
        .catch(err => {
            console.log(err);
        });
};

exports.getReset = (req, res, next) => {
    let message = req.flash("error");
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render("auth/reset", {
        path: "/reset",
        errorMessage: message,
    });
};

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect("/reset");
        }
        const token = buffer.toString("hex");
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash("error", "No account with that email found !");
                    return res.redirect("/reset");
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect("/");
                transporter.sendMail({
                    from: "datz0512shop@gmail.com",
                    to: req.body.email,
                    subject: "Password reset",
                    html: `
                        <p>Hi ${req.body.email},</p>
                        <p>Forgot your password ?</p>
                        <p>We have received a request to reset the password for your account.</p>
                        <p>To reset your password, click on the button below:</p>
                        <button style="display: inline-block; padding: 0.5rem 1rem; text-decoration: none; font: inherit; border: 1px solid rgb(92, 19, 155); background: purple; border-radius: 3px; cursor: pointer;">
                            <a style="text-decoration: none; padding: 10px; font-size: 17px; color: white" href='http://localhost:3000/reset/${token}'>Reset password</a>
                        </button>
                    `,
                });
            })
            .catch(err => {
                console.log(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                });
            });
    });
};

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: { $gt: Date.now() },
    })
        .then(user => {
            let message = req.flash("error");
            if (message.length > 0) {
                message = message[0];
            } else {
                message = null;
            }
            res.render("auth/new-password", {
                path: "/new-password",
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;

    let resetUser;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId,
    })
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12);
        })
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined;
            resetUser.resetTokenExpiration = undefined;
            return resetUser.save();
        })
        .then(result => {
            res.redirect("/login");
            transporter.sendMail({
                from: "datz0512shop@gmail.com",
                to: resetUser.email,
                subject: "Password changed successfully!",
                html: "<h1>You have successfully changed your password!</h1>",
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
