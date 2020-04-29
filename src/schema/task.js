const { gql } = require("apollo-server-express");
const taskConfigMap = require("../task-config");

const Type = gql`
    type Task {
        id: ID!
        title: String!
        description: String!
        maxRunCount: Int!
        points: Int!
    }

    type Reward {
        id: ID!
        title: String!
        description: String!
    }
`;

const Query = gql`
    extend type Query {
        "取得所有任務"
        tasks: [Task]!
        "取得所有可以兌換的獎勵"
        rewards: [Reward]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        tasks: async () => {
            return Object.keys(taskConfigMap).map(el => ({
                id: el,
                title: el,
                description: el,
                maxRunCount: taskConfigMap[el].maxRunCount,
                points: taskConfigMap[el].points,
            }));
        },
        rewards: async () => [
            {
                id: "POINTS",
                title: "POINTS",
                description: "POINTS",
            },
        ],
    },
    Mutation: {},
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
