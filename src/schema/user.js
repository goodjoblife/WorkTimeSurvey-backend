const { gql, UserInputError } = require("apollo-server-express");
const ExperienceModel = require("../models/experience_model");
const ReplyModel = require("../models/reply_model");
const WorkingModel = require("../models/working_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require("../libs/validation");

const Type = gql`
    type User {
        _id: ID!
        name: String!
        facebook_id: String
        email: String
        email_status: EmailStatus
        created_at: Date!

        "The user's experiences"
        experiences(start: Int = 0, limit: Int = 20): [Experience!]!
        experience_count: Int!

        "The user's replies"
        replies(start: Int = 0, limit: Int = 20): [Reply!]!
        reply_count: Int!

        "The user's salary_work_time"
        salary_work_times: [SalaryWorkTime!]!
        salary_work_time_count: Int!
    }

    enum EmailStatus {
        UNVERIFIED
        SENT_VERIFICATION_LINK
        VERIFIED
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
        async experience_count(user, args, { db }) {
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
        async reply_count(user, args, { db }) {
            const query = {
                author_id: user._id,
            };

            const reply_model = new ReplyModel(db);
            const count = await reply_model.getCount(query);

            return count;
        },
        async salary_work_times(user, args, { db }) {
            const query = {
                user_id: user._id,
            };

            const working_model = new WorkingModel(db);
            const workings = await working_model.getWorkings(query);

            return workings;
        },
        async salary_work_time_count(user, args, { db }) {
            const query = {
                user_id: user._id,
            };

            const working_model = new WorkingModel(db);
            const count = await working_model.getWorkingsCountByQuery(query);

            return count;
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
