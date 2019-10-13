const { gql, UserInputError } = require("apollo-server-express");
const R = require("ramda");
const WorkingModel = require("../models/working_model");
const {
    requiredNumberInRange,
    requiredNumberGreaterThanOrEqualTo,
} = require("../libs/validation");

const Type = gql`
    type SalaryWorkTime {
        id: ID
        company: Company!
        job_title: JobTitle!
        day_promised_work_time: Float
        day_real_work_time: Float
        employment_type: EmploymentType
        experience_in_year: Int
        overtime_frequency: Int
        salary: Salary
        sector: String
        week_work_time: Float
        created_at: Date!
        data_time: YearMonth!
        estimated_hourly_wage: Float
        about_this_job: String
    }

    type SalaryWorkTimeStatistics {
        count: Int!
        average_week_work_time: Float
        average_estimated_hourly_wage: Float
        has_compensatory_dayoff_count: YesNoOrUnknownCount
        has_overtime_salary_count: YesNoOrUnknownCount
        is_overtime_salary_legal_count: YesNoOrUnknownCount
    }

    "單一公司內不同職稱的平均薪資資料"
    type companyAverageSalary {
        company: Company!
        average_salaries: [AverageSalary!]
    }

    "單一公司單一職稱的平均薪資"
    type AverageSalary {
        job_title: JobTitle!
        company: Company!
        data_num: Int!
        average_salary: Salary!
    }

    "單一職稱的薪資分布"
    type JobTitleSalaryDistribution {
        job_title: JobTitle!
        bins: [SalaryDistributionBin!]
    }

    "薪資分布的一個 bin（範圍＋數量）"
    type SalaryDistributionBin {
        data_num: Int!
        range: SalaryRange!
    }

    type SalaryRange {
        type: SalaryType!
        from: Int!
        to: Int!
    }

    type YearMonth {
        year: Int!
        month: Int!
    }

    type Salary {
        type: SalaryType
        amount: Int
    }

    type YesNoOrUnknownCount {
        yes: Int!
        no: Int!
        unknown: Int!
    }

    enum Gender {
        female
        male
        other
    }

    enum SearchBy {
        COMPANY
        JOB_TITLE
    }

    enum SortBy {
        CREATED_AT
        WEEK_WORK_TIME
        ESTIMATED_HOURLY_WAGE
    }

    enum Order {
        DESCENDING
        ASCENDING
    }

    enum SalaryType {
        year
        month
        day
        hour
    }

    enum YesNoOrUnknown {
        yes
        no
        unknown
    }

    enum EmploymentType {
        full_time
        part_time
        intern
        temporary
        contract
        dispatched_labor
    }
`;

const Query = gql`
    extend type Query {
        "取得薪資工時列表 （未下關鍵字搜尋的情況），只有從最新排到最舊"
        salary_work_times(start: Int!, limit: Int!): [SalaryWorkTime!]!

        "薪資工時總數"
        salary_work_time_count: Int!

        "取得資料數較多的公司，不同職業的平均薪資"
        popular_company_average_salary: [companyAverageSalary]

        "取得資料數較多的職稱的薪資分佈"
        popular_job_title_salary_distribution: [JobTitleSalaryDistribution]
    }
`;

const Mutation = `
`;

const resolvers = {
    YesNoOrUnknown: {
        unknown: "don't know",
    },
    EmploymentType: {
        full_time: "full-time",
        part_time: "part-time",
        dispatched_labor: "dispatched-labor",
    },
    SalaryWorkTime: {
        id: salaryWorkTime => {
            return salaryWorkTime._id;
        },
        job_title: salaryWorkTime => {
            return {
                name: salaryWorkTime.job_title,
            };
        },
    },
    SalaryWorkTimeStatistics: {
        count: salary_work_times => salary_work_times.length,
        average_week_work_time: salary_work_times => {
            const target = R.pipe(
                R.map(R.prop("week_work_time")),
                R.filter(x => typeof x === "number")
            )(salary_work_times);

            if (target.length > 0) {
                return R.sum(target) / target.length;
            }
            return null;
        },
        average_estimated_hourly_wage: salary_work_times => {
            const target = R.pipe(
                R.map(R.prop("estimated_hourly_wage")),
                R.filter(x => typeof x === "number")
            )(salary_work_times);

            if (target.length > 0) {
                return R.sum(target) / target.length;
            }
            return null;
        },
        has_compensatory_dayoff_count: salary_work_times => {
            if (salary_work_times.length < 5) {
                return null;
            }

            const counts = R.countBy(R.prop("has_compensatory_dayoff"))(
                salary_work_times
            );

            return {
                yes: counts["yes"] || 0,
                no: counts["no"] || 0,
                unknown: counts["don't know"] || 0,
            };
        },
        has_overtime_salary_count: salary_work_times => {
            if (salary_work_times.length < 5) {
                return null;
            }

            const counts = R.countBy(R.prop("has_overtime_salary"))(
                salary_work_times
            );

            return {
                yes: counts["yes"] || 0,
                no: counts["no"] || 0,
                unknown: counts["don't know"] || 0,
            };
        },
        is_overtime_salary_legal_count: salary_work_times => {
            if (salary_work_times.length < 5) {
                return null;
            }

            const counts = R.countBy(R.prop("is_overtime_salary_legal"))(
                salary_work_times
            );

            return {
                yes: counts["yes"] || 0,
                no: counts["no"] || 0,
                unknown: counts["don't know"] || 0,
            };
        },
    },
    Query: {
        async salary_work_times(_, { start, limit }, { db }) {
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
                status: "published",
                "archive.is_archived": false,
            };

            const salary_work_time_model = new WorkingModel(db);
            const salary_work_times = await salary_work_time_model.getWorkings(
                query,
                sort,
                start,
                limit
            );
            return salary_work_times;
        },
        async salary_work_time_count(_, args, { manager }) {
            const query = {
                status: "published",
                "archive.is_archived": false,
            };

            const SalaryWorkTimeModel = manager.SalaryWorkTimeModel;

            const count = await SalaryWorkTimeModel.collection.countDocuments(
                query
            );
            return count;
        },
        // TODO
        popular_company_average_salary() {
            return [
                {
                    company: {
                        name: "聯發科",
                    },
                    average_salaries: [
                        {
                            job_title: {
                                name: "軟體工程師",
                            },
                            company: {
                                name: "聯發科",
                            },
                            data_num: 5,
                            average_salary: {
                                amount: 76000,
                                type: "month",
                            },
                        },
                        {
                            job_title: {
                                name: "數位IC設計工程師",
                            },
                            company: {
                                name: "聯發科",
                            },
                            data_num: 10,
                            average_salary: {
                                amount: 100000,
                                type: "month",
                            },
                        },
                        {
                            job_title: {
                                name: "硬體工程師",
                            },
                            company: {
                                name: "聯發科",
                            },
                            data_num: 10,
                            average_salary: {
                                amount: 80000,
                                type: "month",
                            },
                        },
                    ],
                },
                {
                    company: {
                        name: "大立光",
                    },
                    average_salaries: [
                        {
                            job_title: {
                                name: "製程工程師",
                            },
                            company: {
                                name: "大立光",
                            },
                            data_num: 5,
                            average_salary: {
                                amount: 76000,
                                type: "month",
                            },
                        },
                        {
                            job_title: {
                                name: "數位IC設計工程師",
                            },
                            company: {
                                name: "大立光",
                            },
                            data_num: 10,
                            average_salary: {
                                amount: 100000,
                                type: "month",
                            },
                        },
                        {
                            job_title: {
                                name: "硬體工程師",
                            },
                            company: {
                                name: "大立光",
                            },
                            data_num: 10,
                            average_salary: {
                                amount: 80000,
                                type: "month",
                            },
                        },
                    ],
                },
            ];
        },
        // TODO
        popular_job_title_salary_distribution() {
            return [
                {
                    job_title: {
                        name: "軟體工程師",
                    },
                    bins: [
                        {
                            data_num: 5,
                            range: {
                                type: "month",
                                from: 30000,
                                to: 40000,
                            },
                        },
                        {
                            data_num: 10,
                            range: {
                                type: "month",
                                from: 40000,
                                to: 50000,
                            },
                        },
                        {
                            data_num: 20,
                            range: {
                                type: "month",
                                from: 50000,
                                to: 60000,
                            },
                        },
                        {
                            data_num: 10,
                            range: {
                                type: "month",
                                from: 60000,
                                to: 70000,
                            },
                        },
                    ],
                },
                {
                    job_title: {
                        name: "設計師",
                    },
                    bins: [
                        {
                            data_num: 10,
                            range: {
                                type: "month",
                                from: 30000,
                                to: 40000,
                            },
                        },
                        {
                            data_num: 20,
                            range: {
                                type: "month",
                                from: 40000,
                                to: 50000,
                            },
                        },
                        {
                            data_num: 5,
                            range: {
                                type: "month",
                                from: 50000,
                                to: 60000,
                            },
                        },
                    ],
                },
            ];
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
