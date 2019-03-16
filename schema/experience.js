const { gql } = require("apollo-server-express");

const Type = gql`
    interface Experience {
        id: ID!
        type: ExperienceType!
        company: Company!
        job_title: JobTitle!
        region: String!
        experience_in_year: Int
        education: Education
        salary: Salary
        title: String
        sections: [Section]!
        created_at: Date!
        reply_count: Int!
        report_count: Int!
        like_count: Int!
    }

    type WorkExperience implements Experience {
        id: ID!
        type: ExperienceType!
        company: Company!
        job_title: JobTitle!
        region: String!
        experience_in_year: Int
        education: Education
        salary: Salary
        title: String
        sections: [Section]!
        created_at: Date!
        reply_count: Int!
        report_count: Int!
        like_count: Int!
        "work experience specific fields"
        data_time: YearMonth
        week_work_time: Int
        recommend_to_others: Boolean
    }

    type WorkExperienceStatistics {
        count: Int!
        recommend_to_others: YesNoOrUnknownCount!
    }

    type InterviewExperience implements Experience {
        id: ID!
        type: ExperienceType!
        company: Company!
        job_title: JobTitle!
        region: String!
        experience_in_year: Int
        education: Education
        salary: Salary
        title: String
        sections: [Section]!
        created_at: Date!
        reply_count: Int!
        report_count: Int!
        like_count: Int!
        "interview experience specific fields"
        interview_time: YearMonth!
        interview_result: String!
        overall_rating: Int!
        interview_qas: [InterviewQuestion]
        interview_sensitive_questions: [String]
    }

    type InterviewExperienceStatistics {
        count: Int!
        overall_rating: Float!
    }

    enum ExperienceType {
        WORK
        INTERVIEW
        INTERN
    }

    enum Education {
        "TOFIX"
        bachelor
        master
        doctor
        senior_high
        junior_high
        primary
    }

    type Section {
        subtitle: String
        content: String
    }

    type InterviewQuestion {
        question: String
        answer: String
    }
`;

const Query = gql`
    extend type Query {
        "取得單篇經驗分享"
        experience(id: ID!): Experience
    }
`;

const Mutation = `
`;

const resolvers = {};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
