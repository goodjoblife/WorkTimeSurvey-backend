const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const { isAuthenticated } = require("../utils/resolvers");
const {
    UserPointEvent,
    COMPLETED,
} = require("../models/schemas/userPointEvent");
const User = require("../models/schemas/userModel");
const {
    unlockExperience,
    unlockSalaryWorkTime,
} = require("../libs/events/EventType");

const Type = `
`;

const Query = gql`
    extend type Query {
        me: User!
        "取得已經解鎖的職場經驗列表"
        unlocked_experiences: [Experience!]
        "取得已經解鎖的薪資工時列表"
        unlocked_salary_work_times: [SalaryWorkTime!]
        "目前擁有的積分"
        points: Int!
        "取得該使用者的點數事件（完成任務或兌換獎勵）"
        pointEvents: [UserPointEvent!]
    }
`;

const Mutation = gql`
    extend type Mutation {
        "解鎖某一篇職場經驗"
        unlock_experience(input: ID!): Experience!
        "解鎖某一筆薪資工時"
        unlock_salary_work_times(input: ID!): SalaryWorkTime!
    }
`;

const resolvers = {
    Query: {
        me: combineResolvers(isAuthenticated, async (root, args, context) => {
            const user = context.user;
            return user;
        }),
        unlocked_experiences: combineResolvers(
            isAuthenticated,
            async (root, args, context) => {
                const user = context.user;
                const records = await UserPointEvent.find({
                    user_id: user._id,
                    event_name: unlockExperience,
                    status: COMPLETED,
                });
                if (!records) {
                    return [];
                }
                return (await context.db.collection("experiences").find({
                    _id: { $in: records.map(el => el.doc_id) },
                })).toArray();
            }
        ),
        unlocked_salary_work_times: combineResolvers(
            isAuthenticated,
            async (root, args, context) => {
                const user = context.user;
                const records = await UserPointEvent.find({
                    user_id: user._id,
                    event_name: unlockSalaryWorkTime,
                    status: COMPLETED,
                });
                if (!records) {
                    return [];
                }
                return (await context.db.collection("experiences").find({
                    _id: { $in: records.map(el => el.doc_id) },
                })).toArray();
            }
        ),
        points: combineResolvers(
            isAuthenticated,
            async (root, args, context) => {
                return (await User.findById(context.user._id)).points;
            }
        ),
        pointEvents: combineResolvers(
            isAuthenticated,
            async (root, args, context) => {
                const user = context.user;
                return await UserPointEvent.find({
                    user_id: user._id,
                });
            }
        ),
    },
    Mutation: {
        unlock_experience: combineResolvers(isAuthenticated, async () => {}),
        unlock_salary_work_times: combineResolvers(
            isAuthenticated,
            async () => {}
        ),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
