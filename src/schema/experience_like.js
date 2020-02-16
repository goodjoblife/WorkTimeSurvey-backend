const { gql } = require("apollo-server-express");
const { combineResolvers } = require("graphql-resolvers");

const { ensureToObjectId } = require("../models");
const ExperienceLikeModel = require("../models/experience_like_model");
const ExperienceModel = require("../models/experience_model");
const PopularExperienceLogsModel = require("../models/popular_experience_logs_model");

const { isAuthenticated } = require("../utils/resolvers");

const Type = gql`
    type ExperienceLike {
        id: ID!
        experience: Experience!
        created_at: Date!
    }
`;

const Query = ``;

const Mutation = gql`
    input CreateExperienceLikeInput {
        experience_id: ID!
    }
    type CreateExperienceLikePayload {
        experienceLike: ExperienceLike!
    }
    input DeleteExperienceLikeInput {
        experience_id: ID!
    }
    type DeleteExperienceLikePayload {
        deletedExperienceId: ID!
    }
    extend type Mutation {
        createExperienceLike(
            input: CreateExperienceLikeInput!
        ): CreateExperienceLikePayload!
        deleteExperienceLike(
            input: DeleteExperienceLikeInput!
        ): DeleteExperienceLikePayload!
    }
`;

const resolvers = {
    ExperienceLike: {
        id: experienceLike => experienceLike._id,
        async experience(experienceLike, _, { db }) {
            const experience_model = new ExperienceModel(db);
            const experience = await experience_model.getPublishedExperienceById(
                experienceLike.experience_id
            );

            return experience;
        },
    },

    Mutation: {
        createExperienceLike: combineResolvers(
            isAuthenticated,
            async (_, { input }, { user, db }) => {
                let { experience_id } = input;

                experience_id = ensureToObjectId(experience_id);

                const experience_like_model = new ExperienceLikeModel(db);
                const experience_model = new ExperienceModel(db);
                const popular_experience_logs_model = new PopularExperienceLogsModel(
                    db
                );

                await experience_model.findOneOrFail(experience_id, {
                    _id: 1,
                });
                const experienceLike = await experience_like_model.createLike(
                    experience_id,
                    user
                );
                await experience_model.incrementLikeCount(experience_id);
                await popular_experience_logs_model.insertLog({
                    experience_id,
                    user_id: user._id,
                    action_type: "like",
                });

                return { experienceLike };
            }
        ),
        deleteExperienceLike: combineResolvers(
            isAuthenticated,
            async (_, { input }, { user, db }) => {
                let { experience_id } = input;

                experience_id = ensureToObjectId(experience_id);

                const experience_like_model = new ExperienceLikeModel(db);
                const experience_model = new ExperienceModel(db);

                await experience_model.findOneOrFail(experience_id, { _id: 1 });
                await experience_like_model.deleteLike(experience_id, user);
                await experience_model.decrementLikeCount(experience_id);

                return { deletedExperienceId: experience_id };
            }
        ),
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
