const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");

const Type = gql`
    type JobTitle {
        name: String!

        "取得資料本身"
        salary_work_times: [SalaryWorkTime!]!
        work_experiences(start: Int, limit: Int): [WorkExperience!]!
        interview_experiences(start: Int, limit: Int): [InterviewExperience!]!

        "取得統計資訊"
        salary_work_time_statistics: SalaryWorkTimeStatistics!
        work_experience_statistics: WorkExperienceStatistics!
        interview_experience_statistics: InterviewExperienceStatistics!

        "該職業的薪資分布"
        salary_distribution: SalaryDistribution!
    }
`;

const Query = gql`
    extend type Query {
        search_job_titles(query: String!): [JobTitle!]!
        job_title(name: String!): JobTitle
        popular_job_titles: [JobTitle!]!
    }
`;

const Mutation = `
`;

const resolvers = {
    Query: {
        search_job_titles: async (_, { query: jobTitle }, ctx) => {
            const collection = ctx.db.collection("workings");

            // FIXME: should query from collection `job_titles`
            const jobTitleNames = await collection.distinct("job_title", {
                status: "published",
                "archive.is_archived": false,
                job_title: new RegExp(escapeRegExp(jobTitle.toUpperCase())),
            });

            return jobTitleNames.map(jobTitleName => ({
                name: jobTitleName,
            }));
        },

        job_title: async (_, { name }, ctx) => {
            const collection = ctx.db.collection("workings");

            // FIXME: should query from collection `job_titles`
            const result = await collection.findOne({
                status: "published",
                "archive.is_archived": false,
                job_title: name,
            });

            if (!result) {
                return null;
            }

            return {
                name: result.job_title,
            };
        },
        popular_job_titles: async () => [
            {
                name: "軟體工程師",
            },
        ],
    },
    JobTitle: {
        salary_work_times: async (jobTitle, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byJobTitleLoader.load(
                jobTitle.name
            );
        },
        salary_work_time_statistics: async (jobTitle, _, { manager }) => {
            return await manager.SalaryWorkTimeModel.byJobTitleLoader.load(
                jobTitle.name
            );
        },
        work_experiences: async (jobTitle, _, { manager }) => {
            return await manager.WorkExperienceModel.byJobTitleLoader.load(
                jobTitle.name
            );
        },
        interview_experiences: async (jobTitle, _, { manager }) => {
            return await manager.InterviewExperienceModel.byJobTitleLoader.load(
                jobTitle.name
            );
        },
        // TODO
        work_experience_statistics: () => {},
        interview_experience_statistics: () => {},

        salary_distribution: () => {
            return {
                bins: [
                    {
                        data_count: 5,
                        range: {
                            type: "month",
                            from: 30000,
                            to: 40000,
                        },
                    },
                    {
                        data_count: 10,
                        range: {
                            type: "month",
                            from: 40000,
                            to: 50000,
                        },
                    },
                    {
                        data_count: 20,
                        range: {
                            type: "month",
                            from: 50000,
                            to: 60000,
                        },
                    },
                    {
                        data_count: 10,
                        range: {
                            type: "month",
                            from: 60000,
                            to: 70000,
                        },
                    },
                ],
            };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
