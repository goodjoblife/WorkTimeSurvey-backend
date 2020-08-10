const { gql } = require("apollo-server-express");
const taskConfigMap = require("../libs/events/task_config");

const Type = gql`
    type Task {
        id: ID!
        title: String!
        description: String!
        maxRunCount: Int!
        points: Int!
    }
`;

const Query = gql`
    extend type Query {
        "取得所有任務"
        tasks: [Task]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        tasks: async () => {
            return Object.keys(taskConfigMap).map(id => ({
                id,
                title: taskConfigMap[id].title,
                description: taskConfigMap[id].description,
                maxRunCount: taskConfigMap[id].maxRunCount,
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
