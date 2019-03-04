const { gql } = require("apollo-server-express");

const Type = gql`
    type SalaryWorkTime {
        id: ID
        company: Company!
        job_title: JobTitle!
        day_promised_work_time: Float
        day_real_work_time: Float
        email: String
        employment_type: EmploymentType
        experience_in_year: Int
        gender: Gender
        has_compensatory_dayoff: YesNoOrUnknown
        has_overtime_salary: YesNoOrUnknown
        is_overtime_salary_legal: YesNoOrUnknown
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
        average_week_work_time: Float!
        average_estimated_hourly_wage: Float!
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

const Query = `
`;

const Mutation = `
`;

const resolvers = {
    YesNoOrUnknown: {
        unknown: "don't know",
    },
    EmploymentType: {
        full_time: "full-time",
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
