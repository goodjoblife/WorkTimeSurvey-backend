const { gql } = require("apollo-server-express");
const escapeRegExp = require("lodash/escapeRegExp");

const Type = gql`
    type JobTitle {
        name: String!

        "取得資料本身"
        salary_work_times: [SalaryWorkTime!]!
        work_experiences(start: Int, limit: Int): [WorkExperience]!
        interview_experiences(start: Int, limit: Int): [InterviewExperience]

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
        salary_work_times: async (jobTitle, _, ctx) => {
            const collection = ctx.db.collection("workings");

            const salaryWorkTimes = await collection
                .find({
                    status: "published",
                    "archive.is_archived": false,
                    job_title: jobTitle.name,
                })
                .toArray();

            return salaryWorkTimes;
        },
        salary_work_time_statistics: async (jobTitle, _, ctx) => {
            const collection = ctx.db.collection("workings");

            const statistics = await collection
                .aggregate([
                    {
                        $match: {
                            status: "published",
                            "archive.is_archived": false,
                            job_title: jobTitle.name,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            has_overtime_salary_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_overtime_salary",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_overtime_salary_no: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$has_overtime_salary", "no"] },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_overtime_salary_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_overtime_salary",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_no: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "no",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            is_overtime_salary_legal_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$is_overtime_salary_legal",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_yes: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "yes",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_no: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "no",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            has_compensatory_dayoff_dont: {
                                $sum: {
                                    $cond: [
                                        {
                                            $eq: [
                                                "$has_compensatory_dayoff",
                                                "don't know",
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            avg_week_work_time: {
                                $avg: "$week_work_time",
                            },
                            avg_estimated_hourly_wage: {
                                $avg: "$estimated_hourly_wage",
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            count: 1,
                            average_week_work_time: "$avg_week_work_time",
                            average_estimated_hourly_wage:
                                "$avg_estimated_hourly_wage",
                            has_overtime_salary_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$has_overtime_salary_yes",
                                        no: "$has_overtime_salary_no",
                                        unknown: "$has_overtime_salary_dont",
                                    },
                                    "$skip",
                                ],
                            },
                            is_overtime_salary_legal_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$is_overtime_salary_legal_yes",
                                        no: "$is_overtime_salary_legal_no",
                                        unknown:
                                            "$is_overtime_salary_legal_dont",
                                    },
                                    "$skip",
                                ],
                            },
                            has_compensatory_dayoff_count: {
                                $cond: [
                                    { $gte: ["$count", 5] },
                                    {
                                        yes: "$has_compensatory_dayoff_yes",
                                        no: "$has_compensatory_dayoff_no",
                                        unknown:
                                            "$has_compensatory_dayoff_dont",
                                    },
                                    "$skip",
                                ],
                            },
                        },
                    },
                ])
                .toArray();

            return statistics[0];
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
