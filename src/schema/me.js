const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const { ObjectId } = require("mongodb");
const { isAuthenticated } = require("../utils/resolvers");
const {
    UserPointEvent,
    COMPLETED,
} = require("../models/schemas/userPointEvent");
const User = require("../models/schemas/userModel");
const ExperienceModel = require("../models/experience_model");
const {
    unlockExperience,
    unlockSalaryWorkTime,
} = require("../libs/events/EventType");
const taskConfig = require("../task-config");

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
        unlock_salary_work_time(input: ID!): SalaryWorkTime!
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
        unlock_experience: combineResolvers(
            isAuthenticated,
            async (root, { input }, context) => {
                const user = context.user;
                // 確認 input
                if (!ObjectId.isValid(input)) {
                    throw new Error("參數錯誤");
                }
                const experienceId = ObjectId(input);

                // 確認需要多少點數
                const requiredPoints = taskConfig[unlockExperience].points;

                // 確認使用者是否有足夠點數
                if (user.points < requiredPoints) {
                    throw new Error("點數不足");
                }

                // 確認該使用者是否已經解鎖過
                const hasUnlocked = user.unlocked_experiences.some(exp => {
                    return `${exp._id}` === input;
                });
                if (hasUnlocked) {
                    throw new Error("已經解鎖該篇文章");
                }

                // 確認該篇文張是否存在
                const experienceModel = new ExperienceModel(context.db);
                const experience = experienceModel.findOneOrFail(experienceId);

                // 進行解鎖
                user.unlocked_experiences.splice(0, 0, {
                    _id: experienceId,
                    createdAt: new Date(),
                });
                user.points -= requiredPoints;
                await user.save();

                // 產生 userPointEvent
                await UserPointEvent.create({
                    user_id: user._id,
                    event_name: unlockExperience,
                    snapshot: { experienceId },
                    status: COMPLETED,
                    points: -1 * requiredPoints,
                    created_at: new Date(),
                });

                return experience;
            }
        ),
        unlock_salary_work_time: combineResolvers(
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
