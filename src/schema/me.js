const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const { ObjectId } = require("mongodb");
const { isAuthenticated } = require("../utils/resolvers");
const ExperienceModel = require("../models/experience_model");
const UnlockExperienceEvent = require("../libs/events/rewards/UnlockExperienceEvent");
const UnlockSalaryWorkTimeEvent = require("../libs/events/rewards/UnlockSalaryWorkTimeEvent");

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

                // 執行解鎖
                await new UnlockExperienceEvent(user._id).exec({
                    db: context.db,
                    experienceId,
                });

                // 取得該篇職場經驗
                const experienceModel = new ExperienceModel(context.db);
                const experience = experienceModel.findOneOrFail(experienceId);

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

                // 執行解鎖
                await new UnlockSalaryWorkTimeEvent(user._id).exec({
                    db: context.db,
                    salaryWorkTimeId,
                });

                // 取得該筆薪資工時
                const salaryWorkTimeModel = context.manager.SalaryWorkTimeModel;
                const salaryWorkTime = salaryWorkTimeModel.findOneOrFail(
                    salaryWorkTimeId
                );

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
