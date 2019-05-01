const { gql } = require("apollo-server-express");
const ObjectId = require("mongodb").ObjectId;

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
        education: String
        salary: Salary
        title: String
        sections: [Section!]!
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
        education: String
        salary: Salary
        title: String
        sections: [Section!]!
        created_at: Date!
        reply_count: Int!
        report_count: Int!
        like_count: Int!
        status: PublishStatus!
        archive: Archive!

        "work experience specific fields"
        data_time: YearMonth
        week_work_time: Int
        recommend_to_others: String
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
        education: String
        salary: Salary
        title: String
        sections: [Section!]!
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
        interview_qas: [InterviewQuestion!]
        interview_sensitive_questions: [String!]
    }

    type InterviewExperienceStatistics {
        count: Int!
        overall_rating: Float!
    }

    enum ExperienceType {
        work
        interview
        intern
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
    WorkExperience: {
        id: experience => experience._id,
    },
    InterviewExperience: {
        id: experience => experience._id,
    },
    Query: {
        async experience(_, { id }, ctx) {
            const collection = ctx.db.collection("experiences");

            const result = await collection.findOne({
                _id: ObjectId(id),
                status: "published",
                "archive.is_archived": false,
            });

            if (!result) {
                return null;
            } else {
                return result;
            }
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
