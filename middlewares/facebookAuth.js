const HttpError = require('../libs/errors').HttpError;

const facebookAuth = () => (req, res, next) => {
    if (req.user) {
        req.custom.facebook = req.user;
        next();
    } else {
        next(new HttpError("Unauthorized", 401));
    }
};

module.exports = facebookAuth;
