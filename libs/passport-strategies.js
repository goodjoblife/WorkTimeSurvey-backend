const BearerStrategy = require('passport-http-bearer').Strategy;
const authentication = require('./authentication');

function legacyFacebookTokenStrategy() {
    const option = {
        passReqToCallback: true,
    };
    return new BearerStrategy(option, (req, token, done) => {
        const mongodb = req.db;
        const redis_client = req.redis_client;

        /* Expect
         * ```
         * return done(null, user);
         * ```
         *
         * If the credentials are not valid (for example, if the password is
         * incorrect), done should be invoked with false instead of a user to
         * indicate an authentication failure.
         * ```
         * return done(null, false);
         * ```
         *
         * An additional info message can be supplied to indicate the reason
         * for the failure. This is useful for displaying a flash message
         * prompting the user to try again.
         * ```
         * return done(null, false, { message: 'Incorrect password.' });
         * ```
         *
         * Finally, if an exception occurred while verifying the credentials
         * (for example, if the database is not available), done should be
         * invoked with an error, in conventional Node style.
         * ```
         * return done(err);
         * ```
         */
        authentication.cachedFacebookAuthentication(mongodb, redis_client, token)
            .then(user => {
                done(null, user);
            }, err => {
                done(err, false);
            });
    });
}

module.exports = {
    legacyFacebookTokenStrategy,
};
