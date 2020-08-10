const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const { ObjectId } = require("mongodb");
const { isAuthenticated } = require("../utils/resolvers");
const {
    UserPointEvent,
    COMPLETED,
} = require("../models/schemas/userPointEvent");
const ExperienceModel = require("../models/experience_model");
const {
    unlockExperience,
    unlockSalaryWorkTime,
} = require("../libs/events/EventType");
const taskConfig = require("../libs/events/task_config");

const Type = `
`;

const Query = gql`
    extend type Query {
        me: User!
    }
`;

const Mutation = gql`
    extend type Mutation {
        "解鎖某一篇職場經驗"
        unlockExperience(input: ID!): Experience!
        "解鎖某一筆薪資工時"
        unlockSalaryWorkTime(input: ID!): SalaryWorkTime!
    }
`;

const resolvers = {
    Query: {
        me: combineResolvers(isAuthenticated, async (root, args, context) => {
            const user = context.user;
            return user;
        }),
    },
    Mutation: {
        unlockExperience: combineResolvers(
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
        unlockSalaryWorkTime: combineResolvers(
            isAuthenticated,
            async (root, { input }, context) => {
                const user = context.user;
                // 確認 input
                if (!ObjectId.isValid(input)) {
                    throw new Error("參數錯誤");
                }
                const salaryWorkTimeId = ObjectId(input);

                // 確認需要多少點數
                const requiredPoints = taskConfig[unlockSalaryWorkTime].points;

                // 確認使用者是否有足夠點數
                if (user.points < requiredPoints) {
                    throw new Error("點數不足");
                }

                // 確認該使用者是否已經解鎖過
                const hasUnlocked = user.unlocked_salary_work_times.some(
                    record => {
                        return `${record._id}` === input;
                    }
                );
                if (hasUnlocked) {
                    throw new Error("已經解鎖該筆薪資工時資料");
                }

                // 確認該筆薪資工時是否存在
                const salaryWorkTimeModel = context.manager.SalaryWorkTimeModel;
                const salaryWorkTime = salaryWorkTimeModel.findOneOrFail(
                    salaryWorkTimeId
                );

                // 進行解鎖
                user.unlocked_salary_work_times.splice(0, 0, {
                    _id: salaryWorkTimeId,
                    createdAt: new Date(),
                });
                user.points -= requiredPoints;
                await user.save();

                // 產生 userPointEvent
                await UserPointEvent.create({
                    user_id: user._id,
                    event_name: unlockSalaryWorkTime,
                    snapshot: { salaryWorkTimeId },
                    status: COMPLETED,
                    points: -1 * requiredPoints,
                    created_at: new Date(),
                });

                return salaryWorkTime;
            }
        ),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
