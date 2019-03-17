const { gql } = require("apollo-server-express");

const WorkExperienceType = "work";
const InterviewExperienceType = "interview";
const InternExperienceType = "intern";

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
        status: PublishStatus!
        archive: Archive!
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
        status: PublishStatus!
        archive: Archive!

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
        status: PublishStatus!
        archive: Archive!

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

const resolvers = {
    Experience: {
        __resolveType(experience) {
            if (experience.type === WorkExperienceType) {
                return "WorkExperience";
            }
            if (experience.type === InterviewExperienceType) {
                return "InterviewExperience";
            }
            if (experience.type === InternExperienceType) {
                // TODO: Intern
                return null;
            }
            return null;
        },
    },
    ExperienceType: {
        WORK: WorkExperienceType,
        INTERVIEW: InterviewExperienceType,
    },
    WorkExperience: {
        id: experience => experience._id,
    },
    InterviewExperience: {
        id: experience => experience._id,
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
