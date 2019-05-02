const { makeExecutableSchema } = require("apollo-server-express");

const resolvers = require("./resolvers");
const typeDefs = require("./typeDefs");

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

module.exports = schema;
