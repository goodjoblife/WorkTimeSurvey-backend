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
    }
`;

const Query = gql`
    extend type Query {
        search_job_titles(query: String!): [JobTitle!]!
        job_title(name: String!): JobTitle
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
