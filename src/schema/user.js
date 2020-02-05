const {
    gql,
    UserInputError,
    AuthenticationError,
} = require("apollo-server-express");
const Joi = require("@hapi/joi");
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
    },
    Mutation: {
        async facebookLogin(_, { input }, { manager }) {
            const schema = Joi.object({
                accessToken: Joi.string().min(1),
            });

            Joi.assert(input, schema);

            const { accessToken } = input;
            const user_model = manager.UserModel;

            // Check access_token with FB server
            let account = null;
            try {
                account = await facebook.accessTokenAuth(accessToken);
            } catch (e) {
                throw new AuthenticationError("Unauthorized");
            }

            // Retrieve User from DB
            const facebook_id = account.id;
            let user = await user_model.findOneByFacebookId(facebook_id);
            if (!user) {
                user = await user_model.create({
                    name: account.name,
                    facebook_id,
                    facebook: account,
                    email: account.email,
                });
            }

            if (!user.name && account.name) {
                await user_model.collection.updateOne(
                    { _id: user._id },
                    { $set: { name: account.name } }
                );
            }

            if (!user.email && account.email) {
                await user_model.collection.updateOne(
                    { _id: user._id },
                    { $set: { email: account.email } }
                );
            }

            // Sign token
            const token = await jwt.signUser(user);

            return { user: await user_model.findOneById(user._id), token };
        },
        async googleLogin(_, { input }, { manager }) {
            const schema = Joi.object({
                idToken: Joi.string().min(1),
            });

            Joi.assert(input, schema);

            const { idToken } = input;
            const user_model = manager.UserModel;

            // Check access_token with google server
            let account = null;
            try {
                account = await google.verifyIdToken(idToken);
            } catch (e) {
                throw new AuthenticationError("Unauthorized");
            }

            // Retrieve User from DB
            const google_id = account.sub;

            let user = await user_model.findOneByGoogleId(google_id);
            if (!user) {
                user = await user_model.create({
                    name: account.name,
                    google_id,
                    google: account,
                    email: account.email,
                });
            }

            if (!user.name && account.name) {
                await user_model.collection.updateOne(
                    { _id: user._id },
                    { $set: { name: account.name } }
                );
            }

            if (!user.email && account.email) {
                await user_model.collection.updateOne(
                    { _id: user._id },
                    { $set: { email: account.email } }
                );
            }

            // Sign token
            const token = await jwt.signUser(user);

            return { user: await user_model.findOneById(user._id), token };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
