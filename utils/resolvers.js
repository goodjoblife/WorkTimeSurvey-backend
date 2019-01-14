const { HttpError } = require("../libs/errors");

const isAuthenticated = (root, args, context) => {
    if (!context.user) {
        throw new HttpError("Unauthorized");
    }
};

module.exports = {
    isAuthenticated,
};
