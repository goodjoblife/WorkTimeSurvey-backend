const { AuthenticationError } = require("apollo-server-express");

const isAuthenticated = (root, args, context) => {
    if (!context.user) {
        throw new AuthenticationError("User should provide token / login");
    }
};

module.exports = {
    isAuthenticated,
};
