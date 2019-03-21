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
    }

    type SalaryWorkTimeStatistics {
        count: Int!
        average_week_work_time: Float
        average_estimated_hourly_wage: Float
        has_compensatory_dayoff_count: YesNoOrUnknownCount
        has_overtime_salary_count: YesNoOrUnknownCount
        is_overtime_salary_legal_count: YesNoOrUnknownCount
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
        salary_work_times(start: Int!, limit: Int!): [SalaryWorkTime]!
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
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
