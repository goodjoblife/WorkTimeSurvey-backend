const Type = `
    scalar Date

    type SalaryWorkTime {
        id: ID
        company: Company!
        job_title: JobTitle!
        day_promised_work_time: Int
        day_real_work_time: Int
        email: String
        employment_type: EmploymentType!
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

    enum Education {
        abc
        # 大學
        # 碩士
        # 博士
        # 高職
        # 五專
        # 二專
        # 二技
        # 高中
        # 國中
        # 國小
    }

    enum Region {
        abc
        # 彰化縣
        # 嘉義市
        # 嘉義縣
        # 新竹市
        # 新竹縣
        # 花蓮縣
        # 高雄市
        # 基隆市
        # 金門縣
        # 連江縣
        # 苗栗縣
        # 南投縣
        # 新北市
        # 澎湖縣
        # 屏東縣
        # 臺中市
        # 臺南市
        # 臺北市
        # 臺東縣
        # 桃園市
        # 宜蘭縣
        # 雲林縣
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
        # dont know
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

const resolvers = {};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
