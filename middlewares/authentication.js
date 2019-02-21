const { HttpError } = require("../libs/errors");

function requireUserAuthetication(req, res, next) {
    if (!req.user) {
        next(new HttpError("Unauthorized", 401));
        return;
    }
    next();
}

module.exports = {
    requireUserAuthetication,
};
