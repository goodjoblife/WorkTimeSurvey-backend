const {
    gql,
    UserInputError,
    AuthenticationError,
} = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");
const Joi = require("@hapi/joi");
const keyBy = require("lodash/keyBy");
const ExperienceModel = require("../models/experience_model");
const ReplyModel = require("../models/reply_model");
const WorkingModel = require("../models/working_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require("../libs/validation");
const jwt = require("../utils/jwt");
const facebook = require("../libs/facebook");
const google = require("../libs/google");
const { isAuthenticated, isMe } = require("../utils/resolvers");
const { User } = require("../models");

const Type = gql`
    type User {
        _id: ID!
        name: String!
        facebook_id: String
        google_id: String
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

        "取得已經解鎖的職場經驗記錄列表"
        unlocked_experience_records: [ExperienceRecord!]
        "取得已經解鎖的薪資工時紀錄列表"
        unlocked_salary_work_time_records: [SalaryWorkTimeRecord!]
        "目前擁有的積分"
        points: Int!
    }

    type ExperienceRecord {
        unlocked_time: Date!
        data: Experience!
    }

    type SalaryWorkTimeRecord {
        unlocked_time: Date!
        data: SalaryWorkTime!
    }

    enum EmailStatus {
        UNVERIFIED
        SENT_VERIFICATION_LINK
        VERIFIED
    }
`;

const Query = `
`;

const Mutation = gql`
    input FacebookLoginInput {
        accessToken: String!
    }

    input GoogleLoginInput {
        idToken: String!
    }

    type LoginPayload {
        user: User!
        token: String!
    }

    extend type Mutation {
        "Login via facebook client side auth"
        facebookLogin(input: FacebookLoginInput!): LoginPayload!
        "Login via google client side auth"
        googleLogin(input: GoogleLoginInput!): LoginPayload!
    }
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
        unlocked_experience_records: combineResolvers(
            isAuthenticated,
            isMe,
            async (root, args, context) => {
                const user = context.user;
                const records = user.unlocked_experiences || [];
                let experiences = await context.db
                    .collection("experiences")
                    .find({
                        _id: { $in: records.map(r => r._id) },
                    })
                    .toArray();
                experiences = keyBy(experiences, e => e._id);
                return records.map(r => ({
                    unlocked_time: r.created_at,
                    data: experiences[r._id],
                }));
            }
        ),
        unlocked_salary_work_time_records: combineResolvers(
            isAuthenticated,
            isMe,
            async (root, args, context) => {
                const user = context.user;
                const records = user.unlocked_salary_work_times || [];
                let salaryWorkTimes = await context.db
                    .collection("workings")
                    .find({
                        _id: { $in: records.map(r => r._id) },
                    })
                    .toArray();
                salaryWorkTimes = keyBy(salaryWorkTimes, s => s._id);
                return records.map(r => ({
                    unlocked_time: r.created_at,
                    data: salaryWorkTimes[r._id],
                }));
            }
        ),
        points: combineResolvers(
            isAuthenticated,
            isMe,
            async (root, args, context) => {
                return (await User.findById(context.user._id)).points;
            }
        ),
    },
    Mutation: {
        async facebookLogin(_, { input }) {
            const schema = Joi.object({
                accessToken: Joi.string().min(1),
            });

            Joi.assert(input, schema);

            const { accessToken } = input;

            // Check access_token with FB server
            let account = null;
            try {
                account = await facebook.accessTokenAuth(accessToken);
            } catch (e) {
                throw new AuthenticationError("Unauthorized");
            }

            // Retrieve User from DB
            const facebook_id = account.id;
            let user = await User.findOneByFacebookId(facebook_id);
            if (!user) {
                user = new User({
                    name: account.name,
                    facebook_id,
                    facebook: account,
                    email: account.email,
                });
                user = await user.save();
            }

            if (!user.name && account.name) {
                user.name = account.name;
                await user.save();
            }

            if (!user.email && account.email) {
                user.email = account.email;
                await user.save();
            }

            // Sign token
            const token = await jwt.signUser(user);

            return { user: await User.findById(user._id), token };
        },
        async googleLogin(_, { input }) {
            const schema = Joi.object({
                idToken: Joi.string().min(1),
            });

            Joi.assert(input, schema);

            const { idToken } = input;

            // Check access_token with google server
            let account = null;
            try {
                account = await google.verifyIdToken(idToken);
            } catch (e) {
                throw new AuthenticationError("Unauthorized");
            }

            // Retrieve User from DB
            const google_id = account.sub;

            let user = await User.findOneByGoogleId(google_id);
            if (!user) {
                user = new User({
                    name: account.name,
                    google_id,
                    google: account,
                    email: account.email,
                });
                user = await user.save();
            }

            if (!user.name && account.name) {
                user.name = account.name;
                await user.save();
            }

            if (!user.email && account.email) {
                user.email = account.email;
                await user.save();
            }

            // Sign token
            const token = await jwt.signUser(user);

            return { user: await User.findById(user._id), token };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
