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
        overtime_frequency_count: OvertimeFrequencyCount

        "不同職業的平均薪資"
        job_average_salaries: [JobAverageSalary!]!
    }

    type JobAverageSalary {
        job_title: JobTitle!
        average_salary: Salary!
        data_count: Int!
    }

    "薪資分布"
    type SalaryDistribution {
        bins: [SalaryDistributionBin!]
    }

    "薪資分布的一個 bin（範圍＋數量）"
    type SalaryDistributionBin {
        data_count: Int!
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

    type OvertimeFrequencyCount {
        "對應到表單的「幾乎不」"
        seldom: Int!
        "對應到表單的「偶爾」"
        sometimes: Int!
        "對應到表單的「經常」"
        usually: Int!
        "對應到表單的「幾乎每天」"
        almost_everyday: Int!
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
        overtime_frequency_count: salary_work_times => {
            // 把 DB 中 overtime_frequency 的 0 ~ 3 mapping 到有語意的字串
            const mapping = [
                "seldom",
                "sometimes",
                "usually",
                "almost_everyday",
            ];
            const counter = {
                seldom: 0,
                sometimes: 0,
                usually: 0,
                almost_everyday: 0,
            };
            salary_work_times.forEach(salary_work_time => {
                if (salary_work_time.overtime_frequency !== undefined) {
                    counter[mapping[salary_work_time.overtime_frequency]] += 1;
                }
            });
            return counter;
        },
        // TODO
        job_average_salaries: () => {
            return [
                {
                    job_title: {
                        name: "軟體工程師",
                    },
                    data_count: 5,
                    average_salary: {
                        amount: 76000,
                        type: "month",
                    },
                },
                {
                    job_title: {
                        name: "數位IC設計工程師",
                    },
                    data_count: 10,
                    average_salary: {
                        amount: 100000,
                        type: "month",
                    },
                },
                {
                    job_title: {
                        name: "硬體工程師",
                    },
                    data_count: 10,
                    average_salary: {
                        amount: 80000,
                        type: "month",
                    },
                },
            ];
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
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
