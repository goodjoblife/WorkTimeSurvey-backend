const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const { isAuthenticated } = require("../utils/resolvers");

const Type = `
`;

const Query = gql`
    extend type Query {
        me: User!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        me: combineResolvers(isAuthenticated, async (root, args, context) => {
            const user = context.user;
            return user;
        }),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
