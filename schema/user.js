const { gql, UserInputError } = require("apollo-server-express");
const ExperienceModel = require("../models/experience_model");
const ReplyModel = require("../models/reply_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require("../libs/validation");

const Type = gql`
    type User {
        _id: ID!
        name: String!
        facebook_id: String

        "The user's experiences"
        experiences(start: Int = 0, limit: Int = 20): [Experience!]!
        experiences_count: Int!

        "The user's replies"
        replies(start: Int = 0, limit: Int = 20): [Reply!]!
        replies_count: Int!
    }
`;

const Query = `
`;

const Mutation = `
`;

const resolvers = {
    User: {
        async experiences(user, { start, limit }, { db }) {
            if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
                throw new UserInputError("start 格式錯誤");
            }
            if (!requiredNumberInRange(limit, 1, 100)) {
                throw new UserInputError("limit 格式錯誤");
            }

            const sort = {
                created_at: -1,
            };
            const query = {
                author_id: user._id,
            };

            const experience_model = new ExperienceModel(db);
            const experiences = await experience_model.getExperiences(
                query,
                sort,
                start,
                limit
            );

            return experiences;
        },
        async experiences_count(user, args, { db }) {
            const query = {
                author_id: user._id,
            };

            const experience_model = new ExperienceModel(db);
            const count = await experience_model.getExperiencesCountByQuery(
                query
            );

            return count;
        },
        async replies(user, { start, limit }, { db }) {
            if (!requiredNumberGreaterThanOrEqualTo(start, 0)) {
                throw new UserInputError("start 格式錯誤");
            }
            if (!requiredNumberInRange(limit, 1, 100)) {
                throw new UserInputError("limit 格式錯誤");
            }

            const sort = {
                created_at: -1,
            };
            const query = {
                author_id: user._id,
            };

            const reply_model = new ReplyModel(db);
            const replies = await reply_model.getReplies(
                query,
                sort,
                start,
                limit
            );

            return replies;
        },
        async replies_count(user, args, { db }) {
            const query = {
                author_id: user._id,
            };

            const reply_model = new ReplyModel(db);
            const count = await reply_model.getCount(query);

            return count;
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};