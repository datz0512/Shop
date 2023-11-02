const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const { google } = require("googleapis");

const User = require("../models/user");

const CLIENT_ID =
    "860935289119-kao17rrd80pasag0bl14g6hgj8e6appv.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
    "1//04k5yaws6K5utCgYIARAAGAQSNwF-L9Iram27DTCk4EhmEr_9wlAKMq4pWtnkTTjCC8eiyOoiZEA-GkUiQ4-4jDbLySCGjzM1BQM";

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
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                req.flash("error", "Invalid email or password!");
                return res.redirect("/login");
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
                    res.redirect("/login");
                })
                .catch(err => {
                    console.log(err);
                });
        })
        .catch(err => {
            console.log(err);
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
        pageTitle: "Signup",
        path: "/signup",
    });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    User.findOne({ email: email })
        .then(userDoc => {
            if (userDoc) {
                req.flash(
                    "error",
                    "Email already exists! Please enter a valid email."
                );
                return res.redirect("/login");
            }
            return bcrypt
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
        })
        .catch(err => {
            console.log(err);
        });
};
