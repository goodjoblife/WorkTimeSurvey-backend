const { gql } = require("apollo-server-express");
const ExperienceModel = require("../models/experience_model");
const ReplyLikeModel = require("../models/reply_like_model");

const Type = gql`
    type Reply {
        id: ID!
        content: String!
        like_count: Int!
        report_count: Int!
        floor: Int!
        created_at: Date!
        status: PublishStatus!

        "相對應的 experience (resolve if published)"
        experience: Experience

        "使用者是否按贊 (null 代表未傳入驗證資訊)"
        liked: Boolean
    }
`;

const Query = `
`;

const Mutation = `
`;

const resolvers = {
    Reply: {
        id: reply => reply._id,
        async experience(reply, args, { db }) {
            const experience_model = new ExperienceModel(db);
            const experience_id = reply.experience_id;
            const experience = await experience_model.findOneOrFail(
                experience_id
            );
            if (experience.status === "published") {
                return experience;
            }
            return null;
        },
        async liked(reply, args, { db, user }) {
            if (!user) {
                return null;
            }

            const reply_like_model = new ReplyLikeModel(db);
            const result = await reply_like_model.collection.findOne({
                reply_id: reply._id,
                user_id: user._id,
            });

            if (result) {
                return true;
            }

            return false;
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
