const passport = require("passport");

function semiAuthentication(name, options = {}) {
    return (req, res, next) => {
        passport.authenticate(name, options, (err, user) => {
            if (user) {
                req.user = user;
            }
            next();
        })(req, res, next);
    };
}

module.exports = {
    semiAuthentication,
};
