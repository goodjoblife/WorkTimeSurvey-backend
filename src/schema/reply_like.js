const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");

const { isAuthenticated } = require("../utils/resolvers");
const ReplyLikeModel = require("../models/reply_like_model");
const ReplyModel = require("../models/reply_model");
const ExperienceModel = require("../models/experience_model");

const Type = gql`
    type ReplyLike {
        id: ID!
        reply: Reply!
        reply_time: Date!
        experience: Experience
        created_at: Date!
    }
`;

const Query = ``;

const Mutation = gql`
    input CreateReplyLikeInput {
        reply_id: ID!
    }

    type CreateReplyLikePayload {
        replyLike: ReplyLike!
    }

    input DeleteReplyLikeInput {
        id: ID!
    }

    type DeleteReplyLikePayload {
        deletedReplyLikeId: ID!
    }

    extend type Mutation {
        createReplyLike(input: CreateReplyLikeInput!): CreateReplyLikePayload!
        deleteReplyLike(input: DeleteReplyLikeInput!): DeleteReplyLikePayload!
    }
`;

const resolvers = {
    ReplyLike: {
        id: replyLike => replyLike._id,
        async experience(replyLike, _, { db }) {
            const experience_model = new ExperienceModel(db);
            const experience_id = replyLike.experience_id;
            const experience = await experience_model.findOneOrFail(
                experience_id
            );
            if (experience.status === "published") {
                return experience;
            }
            return null;
        },
        async reply(replyLike, _, { db }) {
            const reply_model = new ReplyModel(db);
            const reply = await reply_model.getReplyById(replyLike.reply_id);

            return reply;
        },
    },

    Mutation: {
        createReplyLike: combineResolvers(
            isAuthenticated,
            async (_, { input }, { user, db }) => {
                const { reply_id } = input;

                const reply_like_model = new ReplyLikeModel(db);
                const reply_model = new ReplyModel(db);

                const replyLike = await reply_like_model.createLike(
                    reply_id,
                    user
                );
                await reply_model.incrementLikeCount(reply_id);

                return {
                    replyLike,
                };
            }
        ),
        deleteReplyLike: combineResolvers(
            isAuthenticated,
            async (_, { input }, { user, db }) => {
                const { id } = input;

                const reply_like_model = new ReplyLikeModel(db);
                const reply_model = new ReplyModel(db);

                await reply_like_model.deleteLike(id, user);
                await reply_model.decrementLikeCount(id);

                return { deletedReplyLikeId: id };
            }
        ),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
