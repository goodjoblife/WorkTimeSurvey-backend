const { gql, UserInputError } = require("apollo-server-express");
const { ObjectId } = require("mongodb");
const R = require("ramda");
const winston = require("winston");

const { requiredNumberInRange } = require("../libs/validation");
const ExperienceModel = require("../models/experience_model");
const UserModel = require("../models/user_model");

const WorkExperienceType = "work";
const InterviewExperienceType = "interview";
const InternExperienceType = "intern";

const MAX_PREVIEW_SIZE = 160;

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

        "使用者是否按贊 (null 代表未傳入驗證資訊)"
        liked: Boolean

        "preview，通常是列表時可以用來簡單預覽內容"
        preview: String
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
        "發布狀態"
        status: PublishStatus!
        "封存資訊"
        archive: Archive!

        "使用者是否按贊 (null 代表未傳入驗證資訊)"
        liked: Boolean

        "preview，通常是列表時可以用來簡單預覽內容"
        preview: String

        "work experience specific fields"
        data_time: YearMonth
        week_work_time: Float
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

        "使用者是否按贊 (null 代表未傳入驗證資訊)"
        liked: Boolean

        "preview，通常是列表時可以用來簡單預覽內容"
        preview: String

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

    type InternExperience implements Experience {
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

        "使用者是否按贊 (null 代表未傳入驗證資訊)"
        liked: Boolean

        "preview，通常是列表時可以用來簡單預覽內容"
        preview: String

        "intern experience specific fields"
        starting_year: Int
        overall_rating: Float
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
        popular_experiences(
            "返回的資料筆數，須 <= 20"
            returnNumber: Int = 3
            sampleNumber: Int = 20
        ): [Experience!]!
    }
`;

const Mutation = `
    input CreateInterviewExperienceInput {
        "Common"
        company: CompanyInput!
        region: String!
        job_title: String!
        title: String!
        sections: [SectionInput!]!
        experience_in_year: Int
        education: String
        status: String = published
        email: String
        "interview part"
        interview_time: InterviewTimeInput!
        interview_result: String!
        interview_qas: [InterviewQuestionInput!]
        interview_sensitive_questions: [String!]
        salary: SalaryInput
        overall_rating: Int!
    }

    input CompanyInput {
        id: String
        name: String
    }

    input InterviewTimeInput {
        year: Int!
        month: Int!
    }

    input SalaryInput {
        type: String!
        amount: Float!
    }

    input SectionInput {
        subtitle: String
        content: String!
    }

    input InterviewQuestionInput {
        question: String
        answer: String
    }

    type CreateInterviewExperiencePayload {
        success: Boolean!
        experience: InterviewExperience!
    }

    input CreateWorkExperienceInput {
        "Common"
        company: CompanyInput!
        region: String!
        job_title: String!
        title: String!
        sections: [SectionInput!]!
        experience_in_year: Int
        education: String
        status: String = published
        email: String
        "work part"
        salary: SalaryInput
        week_work_time: Int
        recommend_to_others: recommendToOthersType
        is_currently_employed: isCurrentEmployedType!
        "will have this column if 'is_currently_employed' === no"
        job_ending_time: jobEndingTimeInput
    }

    enum isCurrentEmployedType {
        yes
        no
    }

    enum recommendToOthersType {
        yes
        no
    }

    input jobEndingTimeInput {
        year: Int!
        month: Int!
    }

    type CreateWorkExperiencePayload {
        success: Boolean!
        experience: WorkExperience!
    }

    extend type Mutation {
        createInterviewExperience(
            input: CreateInterviewExperienceInput!
        ): CreateInterviewExperiencePayload!
        createWorkExperience(
            input: CreateWorkExperienceInput!
        ): CreateWorkExperiencePayload!
    }
`;

const ExperienceLikedResolver = async (experience, args, { manager, user }) => {
    if (!user) {
        return null;
    }

    const like = await manager.ExperienceLikeModel.getLikeByExperienceAndUser(
        experience._id,
        user
    );

    if (like) {
        return true;
    }
    return false;
};

const ExperiencePreviewResolver = experience => {
    const section = R.head(experience.sections);
    if (!section) {
        return null;
    }
    return section.content.substring(0, MAX_PREVIEW_SIZE);
};

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
                return "InternExperience";
            }
            return null;
        },
    },
    WorkExperience: {
        id: experience => experience._id,
        job_title: experience => ({
            name: experience.job_title,
        }),
        liked: ExperienceLikedResolver,
        preview: ExperiencePreviewResolver,
    },
    InterviewExperience: {
        id: experience => experience._id,
        job_title: experience => ({
            name: experience.job_title,
        }),
        liked: ExperienceLikedResolver,
        preview: ExperiencePreviewResolver,
    },
    InternExperience: {
        id: experience => experience._id,
        job_title: experience => ({
            name: experience.job_title,
        }),
        liked: ExperienceLikedResolver,
        preview: ExperiencePreviewResolver,
        region: experience => experience.region || "",
    },
    Query: {
        async experience(_, { id }, ctx) {
            const collection = ctx.db.collection("experiences");

            if (!ObjectId.isValid(id)) {
                return null;
            }

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

        async popular_experiences(_, { returnNumber, sampleNumber }, ctx) {
            if (!requiredNumberInRange(returnNumber, 0, 20)) {
                throw new UserInputError("returnNumber 必須是 0 ~ 20");
            }

            const collection = ctx.db.collection("experiences");

            const thirtyDays = 30 * 24 * 60 * 60 * 1000;

            const result = await collection
                .aggregate([
                    {
                        $match: {
                            created_at: {
                                $gte: new Date(new Date() - thirtyDays),
                            },
                            status: "published",
                            "archive.is_archived": false,
                        },
                    },
                    {
                        $addFields: {
                            contentsLength: {
                                $strLenCP: {
                                    $reduce: {
                                        input: "$sections",
                                        initialValue: "1",
                                        in: {
                                            $concat: [
                                                "$$value",
                                                "$$this.content",
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $sort: {
                            contentsLength: -1,
                        },
                    },
                    {
                        $limit: sampleNumber,
                    },
                    {
                        $sample: {
                            size: returnNumber,
                        },
                    },
                ])
                .toArray();

            return result;
        },
    },

    Mutation: {
        async createInterviewExperience(
            root,
            { input },
            { db, user, manager, ip, ips }
        ) {
            const experience = input;

            Object.assign(experience, {
                type: "interview",
                author_id: user._id,
                like_count: 0,
                reply_count: 0,
                report_count: 0,
                // TODO 瀏覽次數？
                created_at: new Date(),
                // 封存狀態
                archive: {
                    is_archived: false,
                    reason: "",
                },
            });

            const experience_model = new ExperienceModel(db);

            // insert data into experiences collection
            await experience_model.createExperience(experience);

            // update user email & subscribeEmail, if email field exists
            if (experience.email) {
                const user_model = new UserModel(manager);
                await user_model.updateSubscribeEmail(
                    user._id,
                    experience.email
                );
            }

            winston.info("interview experiences insert data success", {
                id: experience._id,
                ip,
                ips,
            });

            return {
                success: true,
                experience,
            };
        },
        async createWorkExperience(
            root,
            { input },
            { db, user, manager, ip, ips }
        ) {
            const experience = input;

            Object.assign(experience, {
                type: "work",
                author_id: user._id,
                like_count: 0,
                reply_count: 0,
                report_count: 0,
                // TODO 瀏覽次數？
                created_at: new Date(),
                // 封存狀態
                archive: {
                    is_archived: false,
                    reason: "",
                },
            });

            if (experience.is_currently_employed === "yes") {
                const now = new Date();
                const data_time = {
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                };

                experience.data_time = data_time;
            } else {
                experience.data_time = experience.job_ending_time;
            }

            const experience_model = new ExperienceModel(db);

            await experience_model.createExperience(experience);
            if (experience.email) {
                const user_model = new UserModel(manager);
                await user_model.updateSubscribeEmail(
                    user._id,
                    experience.email
                );
            }

            winston.info("work experiences insert data success", {
                id: experience._id,
                ip,
                ips,
            });

            return {
                success: true,
                experience,
            };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
