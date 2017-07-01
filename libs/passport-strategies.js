const config = require('config');
const FacebookStrategy = require('passport-facebook').Strategy;

const facebookStrategy = new FacebookStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: "/auth/facebook/callback",
},
(accessToken, refreshToken, profile, done) => {
    if (!profile) {
        return done(null, false);
    } else {
        return done(null, profile);
    }
});

module.exports = {
    facebookStrategy,
};
