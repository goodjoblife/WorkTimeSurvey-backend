const { gql } = require("apollo-server-express");
const rewardConfigMap = require("../libs/events/reward_config");

const Type = gql`
    type Reward {
        id: ID!
        title: String!
        description: String!
    }
`;

const Query = gql`
    extend type Query {
        "取得所有可以兌換的獎勵"
        rewards: [Reward]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        rewards: async () => {
            return Object.keys(rewardConfigMap).map(id => ({
                id,
                title: rewardConfigMap[id].title,
                description: rewardConfigMap[id].description,
                maxRunCount: rewardConfigMap[id].maxRunCount,
            }));
        },
    },
    Mutation: {},
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
