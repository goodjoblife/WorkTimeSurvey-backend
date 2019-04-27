const { ApolloServer } = require("apollo-server-express");

module.exports = (app, options) => {
    const final_options = {
        ...options,
        playground: app.get("env") === "development",
        debug: app.get("env") === "development",
    };
    const server = new ApolloServer(final_options);
    server.applyMiddleware({ app, disableHealthCheck: true, cors: false });
};
