const passport = require("passport");
const { HttpError } = require("../libs/errors");

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

function requireUserAuthetication(req, res, next) {
    if (!req.user) {
        next(new HttpError("Unauthorized", 401));
        return;
    }
    next();
}

module.exports = {
    semiAuthentication,
    requireUserAuthetication,
};
