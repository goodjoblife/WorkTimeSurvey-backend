const { gql } = require("apollo-server-express");

const Type = gql`
    type User {
        _id: ID!
        name: String!
        facebook_id: String
        email: String
        email_status: EmailStatus
        created_at: Date!
    }

    enum EmailStatus {
        UNVERIFIED
        SENT_VERIFICATION_LINK
        VERIFIED
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
