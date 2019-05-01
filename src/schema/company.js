const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");

const Type = gql`
    type Company {
        name: String!

        "取得資料本身"
        salary_work_times: [SalaryWorkTime!]!
        work_experiences(start: Int, limit: Int): [WorkExperience!]!
        interview_experiences(start: Int, limit: Int): [InterviewExperience!]!

        "取得統計資訊"
        salary_work_time_statistics: SalaryWorkTimeStatistics!
        work_experience_statistics: WorkExperienceStatistics!
        interview_experience_statistics: InterviewExperienceStatistics!
    }
`;

const Query = gql`
    extend type Query {
        search_companies(query: String!): [Company!]!
        company(name: String!): Company
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        async search_companies(_, { query: company }, ctx) {
            const collection = ctx.db.collection("workings");

            // FIXME: should query from collection `companies`
            const results = await collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            "company.name": new RegExp(
                                escapeRegExp(company.toUpperCase())
                            ),
                        },
                    },
                    {
                        $group: {
                            _id: "$company",
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            id: "$_id.id",
                            name: "$_id.name",
                        },
                    },
                ])
                .toArray();

            return results;
        },

        company: async (_, { name }, ctx) => {
            const collection = ctx.db.collection("workings");

            // FIXME: should query from collection `companies`
            const result = await collection.findOne({
                status: "published",
                "archive.is_archived": false,
                "company.name": name,
            });

            if (!result) {
                return null;
            }

            return {
                name: result.company.name,
            };
        },
    },
    Company: {
        salary_work_times: async (company, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byCompanyLoader.load(
                company.name
            );
        },
        salary_work_time_statistics: async (company, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byCompanyLoader.load(
                company.name
            );
        },
        // TODO
        work_experiences: () => {},
        interview_experiences: () => {},
        work_experience_statistics: () => {},
        interview_experience_statistics: () => {},
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
