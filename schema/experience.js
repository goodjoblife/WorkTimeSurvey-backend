const { gql } = require("apollo-server-express");

const Type = gql`
    type Experience {
        _id: ID!
        type: String!
        title: String!
        status: PublishStatus!
        archive: Archive!
    }
`;

const Query = `
`;

const Mutation = `
`;

const resolvers = {};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
