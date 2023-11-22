const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const CLIENT_ID =
    "860935289119-kao17rrd80pasag0bl14g6hgj8e6appv.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
    "1//041hkLD6a0h2FCgYIARAAGAQSNwF-L9IrHPaMqQmvpqWAPE5VwIVDq8ohCB3_Q88yvLPzxisTqye2yk6NXb6AnO1KA9nlbvrQDQI";

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const accessToken = oAuth2Client.getAccessToken();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: "datblu2003@gmail.com",
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
    },
});

exports.getLogin = (req, res, next) => {
    let message = req.flash("error");
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render("auth/login", {
        pageTitle: "Login",
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
            pageTitle: "Login",
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
                    pageTitle: "Login",
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
                        pageTitle: "Login",
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
        .catch(err => console.log(err));
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
        pageTitle: "Signup",
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
            pageTitle: "Signup",
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
                from: "datblu2003@gmail.com",
                to: email,
                subject: "Signup succeeded!",
                html: "<h1>You successfully signed up !</h1>",
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
        pageTitle: "Reset Password",
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
                    req.flash("error", "No account with that account found !");
                    return res.redirect("/reset");
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect("/");
                transporter.sendMail({
                    from: "datblu2003@gmail.com",
                    to: req.body.email,
                    subject: "Password reset",
                    html: `
                        <p>You have requested to reset your password</p>
                        <p>Click this <a href='http://localhost:3000/reset/${token}'>link</a> to set a new password</p>
                    `,
                });
            })
            .catch(err => {
                console.log(err);
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
                pageTitle: "New Password",
                path: "/new-password",
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token,
            });
        })
        .catch(err => console.log(err));
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
                from: "datblu2003@gmail.com",
                to: resetUser.email,
                subject: "Password changed successfully!",
                html: "<h1>You have successfully changed your password!</h1>",
            });
        })
        .catch(err => {
            console.log(err);
        });
};
