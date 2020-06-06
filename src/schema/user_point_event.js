const { gql } = require("apollo-server-express");

const Type = gql`
    type UserPointEvent {
        id: ID!
        user: User!
        status: String!
        points: Int!
        createdAt: Date!
        completedAt: Date!
    }
`;

const Query = `
`;

const Mutation = `
`;

const resolvers = {
    Mutation: {},
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
