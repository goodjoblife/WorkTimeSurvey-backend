const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");
const { union } = require("lodash");

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

        "列出所有有資料(薪資工時、職場經驗)的職稱"
        job_titles_having_data: [JobTitle!]!

        "目前用途：取得薪資資料前 topN 多的職稱"
        popular_job_titles(limit: Int = 5): [JobTitle!]!
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
        job_titles_having_data: async (_, __, ctx) => {
            const companiesFromSalaryWorkTime = await ctx.db
                .collection("workings")
                .distinct("job_title", {
                    status: "published",
                    "archive.is_archived": false,
                });
            const companiesFromExperiences = await ctx.db
                .collection("experiences")
                .distinct("job_title", {
                    status: "published",
                    "archive.is_archived": false,
                });

            return union(
                companiesFromSalaryWorkTime,
                companiesFromExperiences
            ).map(name => {
                return {
                    name,
                };
            });
        },
        popular_job_titles: async (_, { limit }, ctx) => {
            const collection = ctx.db.collection("workings");
            const result = await collection
                .aggregate([
                    {
                        $match: {
                            estimated_monthly_wage: {
                                $exists: true,
                                $ne: null,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: { job_title: "$job_title" },
                            count: { $sum: 1 },
                        },
                    },
                    { $match: { count: { $gte: 5 } } },
                    { $sort: { count: -1 } },
                    { $sample: { size: limit } },
                    {
                        $project: {
                            name: "$_id.job_title",
                            count: "$count",
                        },
                    },
                ])
                .toArray();
            return result;
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

        salary_distribution: async (records, _, ctx) => {
            const BUCKET_SIZE = 4;
            const collection = ctx.db.collection("workings");
            const job_title = records.name || records._id.job_title;
            let count = records.count;
            if (typeof count === "undefined") {
                count = await collection
                    .find({
                        estimated_monthly_wage: {
                            $exists: true,
                            $ne: null,
                        },
                        job_title,
                    })
                    .count();
            }
            // count * 0.9 shout be > 1
            if (count < 2) {
                return [];
            }
            const result = await collection
                .aggregate([
                    {
                        $match: {
                            estimated_monthly_wage: {
                                $exists: true,
                                $ne: null,
                            },
                            job_title,
                        },
                    },
                    { $sort: { estimated_monthly_wage: 1 } },
                    { $skip: Math.floor(count * 0.05) },
                    { $limit: Math.floor(count * 0.9) },
                    {
                        $project: {
                            wage: "$estimated_monthly_wage",
                        },
                    },
                ])
                .toArray();
            const minValue = result[0].wage;
            const maxValue = result[result.length - 1].wage;
            const binSize =
                1000 * Math.floor((maxValue - minValue) / BUCKET_SIZE / 1000);
            const bins = new Array(BUCKET_SIZE).fill(0);
            let binIndex = 0;
            let i = 0;
            while (i < result.length) {
                if (result[i].wage <= minValue + binSize * (binIndex + 1)) {
                    bins[binIndex]++;
                    i++;
                } else {
                    if (++binIndex >= BUCKET_SIZE - 1) {
                        bins[binIndex] += result.length - i;
                        break;
                    }
                }
            }
            return {
                bins: bins.map((data_count, index) => ({
                    data_count,
                    range: {
                        from: Math.floor(minValue + index * binSize),
                        to:
                            index === bins.length - 1
                                ? Math.floor(maxValue)
                                : Math.floor(minValue + (index + 1) * binSize),
                        type: "month",
                    },
                })),
            };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
