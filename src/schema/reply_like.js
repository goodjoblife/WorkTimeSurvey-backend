const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");

const { isAuthenticated } = require("../utils/resolvers");
const ReplyLikeModel = require("../models/reply_like_model");
const ReplyModel = require("../models/reply_model");

const Type = gql`
    type ReplyLike {
        id: ID!
        reply: Reply!
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
        reply_id: ID!
    }

    type DeleteReplyLikePayload {
        deletedReplyId: ID!
    }

    extend type Mutation {
        createReplyLike(input: CreateReplyLikeInput!): CreateReplyLikePayload!
        deleteReplyLike(input: DeleteReplyLikeInput!): DeleteReplyLikePayload!
    }
`;

const resolvers = {
    ReplyLike: {
        id: replyLike => replyLike._id,
        async reply(replyLike, _, { db }) {
            const reply_model = new ReplyModel(db);
            const reply = await reply_model.getPublishedReplyById(
                replyLike.reply_id
            );

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
                const { reply_id } = input;

                const reply_like_model = new ReplyLikeModel(db);
                const reply_model = new ReplyModel(db);

                await reply_like_model.deleteLike(reply_id, user);
                await reply_model.decrementLikeCount(reply_id);

                return { deletedReplyId: reply_id };
            }
        ),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
