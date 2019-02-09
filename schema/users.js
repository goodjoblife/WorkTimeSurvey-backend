const Type = `
    type User {
        _id: ID!
        name: String!
        facebook_id: String
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
