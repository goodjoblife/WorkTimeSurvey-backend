const R = require("ramda");
const { gql } = require("apollo-server-express");
const Joi = require("@hapi/joi");

const Type = `
`;

const Query = gql`
    extend type Query {
        job_title_keywords(limit: Int = 5): [String!]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async job_title_keywords(obj, { limit }, ctx) {
            const schema = Joi.number()
                .integer()
                .min(1)
                .max(20);

            Joi.assert(limit, schema);

            const jobTitleKeywordModel = ctx.manager.JobTitleKeywordModel;
            const results = await jobTitleKeywordModel.aggregate({ limit });

            return R.map(R.prop("_id"))(results);
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
