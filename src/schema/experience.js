const { gql, UserInputError } = require("apollo-server-express");
const { ObjectId } = require("mongodb");
const R = require("ramda");
const { omitBy, isNil } = require("lodash");

const { HttpError } = require("../libs/errors");
const {
    shouldIn,
    stringRequireLength,
    validateEmail,
    requiredNumberInRange,
} = require("../libs/validation");
const ExperienceModel = require("../models/experience_model");
const UserModel = require("../models/user_model");
const helper = require("../routes/company_helper");

const WorkExperienceType = "work";
const InterviewExperienceType = "interview";
const InternExperienceType = "intern";

const MAX_PREVIEW_SIZE = 160;

function validateCommonInputFields(data) {
    if (
        !shouldIn(data.region, [
            "彰化縣",
            "嘉義市",
            "嘉義縣",
            "新竹市",
            "新竹縣",
            "花蓮縣",
            "高雄市",
            "基隆市",
            "金門縣",
            "連江縣",
            "苗栗縣",
            "南投縣",
            "新北市",
            "澎湖縣",
            "屏東縣",
            "臺中市",
            "臺南市",
            "臺北市",
            "臺東縣",
            "桃園市",
            "宜蘭縣",
            "雲林縣",
        ])
    ) {
        throw new HttpError(`地區不允許 ${data.region}！`, 422);
    }

    if (!stringRequireLength(data.title, 1, 50)) {
        throw new HttpError("標題僅限 1~50 字！", 422);
    }

    if (!data.sections || !(data.sections instanceof Array)) {
        throw new HttpError("內容要寫喔！", 422);
    }
    data.sections.forEach(section => {
        if (
            section.subtitle !== null &&
            !stringRequireLength(section.subtitle, 1, 25)
        ) {
            throw new HttpError("內容標題僅限 1~25 字！", 422);
        }
        if (!stringRequireLength(section.content, 1, 5000)) {
            throw new HttpError("內容標題僅限 1~5000 字！", 422);
        }
    });

    if (data.experience_in_year) {
        if (data.experience_in_year < 0 || data.experience_in_year > 50) {
            throw new HttpError("相關職務工作經驗需大於等於0，小於等於50", 422);
        }
    }

    if (data.education) {
        if (
            !shouldIn(data.education, [
                "大學",
                "碩士",
                "博士",
                "高職",
                "五專",
                "二專",
                "二技",
                "高中",
                "國中",
                "國小",
            ])
        ) {
            throw new HttpError("最高學歷範圍錯誤", 422);
        }
    }

    if (data.email && !validateEmail(data.email)) {
        throw new HttpError("E-mail 格式錯誤", 422);
    }
}

function validateWorkInputFields(data) {
    if (data.is_currently_employed === "no") {
        if (!data.job_ending_time) {
            throw new HttpError("離職年、月份要填喔！", 422);
        }
        const now = new Date();
        if (data.job_ending_time.year <= now.getFullYear() - 10) {
            throw new HttpError("離職年份需在10年內", 422);
        }
        if (data.job_ending_time.month < 1 || data.job_ending_time.month > 12) {
            throw new HttpError("離職月份需在1~12月", 422);
        }
        if (
            (data.job_ending_time.year === now.getFullYear() &&
                data.job_ending_time.month > now.getMonth() + 1) ||
            data.job_ending_time.year > now.getFullYear()
        ) {
            throw new HttpError("離職月份不可能比現在時間晚", 422);
        }
    }

    if (data.week_work_time) {
        if (data.week_work_time < 0 || data.week_work_time > 168) {
            throw new HttpError("工時需介於 0~168 之間", 422);
        }
    }
}

function validationWorkInputFields(data) {
    validateCommonInputFields(data);
    validateWorkInputFields(data);
}

function validateInterviewInputFields(data) {
    const now = new Date();
    if (data.interview_time.year <= now.getFullYear() - 10) {
        throw new HttpError("面試年份需在10年內", 422);
    }
    if (data.interview_time.month < 1 || data.interview_time.month > 12) {
        throw new HttpError("面試月份需在1~12月", 422);
    }
    if (
        (data.interview_time.year === now.getFullYear() &&
            data.interview_time.month > now.getMonth() + 1) ||
        data.interview_time.year > now.getFullYear()
    ) {
        throw new HttpError("面試月份不可能比現在時間晚", 422);
    }

    data.interview_qas.forEach(qa => {
        if (!stringRequireLength(qa.question, 1, 250)) {
            throw new HttpError("面試題目標題僅限 1~250 字！", 422);
        }

        if (qa.answer) {
            if (!stringRequireLength(qa.answer, 1, 5000)) {
                throw new HttpError("面試題目標題僅限 1~5000 字！", 422);
            }
        }
    });
    if (data.interview_qas.length > 30) {
        throw new HttpError("面試題目列表超過 30 題！", 422);
    }

    if (!stringRequireLength(data.interview_result, 1, 100)) {
        throw new HttpError("面試結果僅限 1~100 字！", 422);
    }

    data.interview_sensitive_questions.forEach(question => {
        if (!stringRequireLength(question, 1, 20)) {
            throw new HttpError("面試中提及的特別問題僅限 1~20 字！", 422);
        }
    });

    if (!shouldIn(data.overall_rating, [1, 2, 3, 4, 5])) {
        throw new HttpError("面試分數有誤", 422);
    }
}

function validationInterviewInputFields(data) {
    validateCommonInputFields(data);
    validateInterviewInputFields(data);
}

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
        content: String!
    }

    type InterviewQuestion {
        question: String!
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

const Mutation = gql`
    input CreateInterviewExperienceInput {
        "Common"
        company: CompanyInput!
        region: String!
        job_title: String!
        title: String!
        sections: [SectionInput!]!
        experience_in_year: Int
        education: String
        email: String
        "interview part"
        interview_time: InterviewTimeInput!
        interview_result: String!
        interview_qas: [InterviewQuestionInput!] = []
        interview_sensitive_questions: [String!] = []
        salary: SalaryInput
        overall_rating: Int!
    }

    input CompanyInput {
        id: String
        query: String!
    }

    input InterviewTimeInput {
        year: Int!
        month: Int!
    }

    input SalaryInput {
        type: SalaryType!
        amount: Float!
    }

    input SectionInput {
        subtitle: String
        content: String!
    }

    input InterviewQuestionInput {
        question: String!
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
        email: String
        "work part"
        salary: SalaryInput
        week_work_time: Int
        recommend_to_others: RecommendToOthersType
        is_currently_employed: IsCurrentEmployedType!
        "will have this column if 'is_currently_employed' === no"
        job_ending_time: JobEndingTimeInput
    }

    enum IsCurrentEmployedType {
        yes
        no
    }

    enum RecommendToOthersType {
        yes
        no
    }

    input JobEndingTimeInput {
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
            { db, user, manager }
        ) {
            const experience = input;

            validationInterviewInputFields(experience);

            const company_model = manager.CompanyModel;

            const company = await helper.getCompanyByIdOrQuery(
                company_model,
                input.company.id,
                input.company.query
            );
            experience.company = company;
            experience.job_title = experience.job_title.toUpperCase();
            experience.interview_qas = experience.interview_qas.map(qas => {
                const result = {
                    question: qas.question,
                };
                if (typeof qas.answer === "undefined" || qas.answer == null) {
                    return result;
                }
                result.answer = qas.answer;
                return result;
            });

            Object.assign(experience, {
                type: "interview",
                author_id: user._id,
                like_count: 0,
                reply_count: 0,
                report_count: 0,
                status: "published",
                // TODO 瀏覽次數？
                created_at: new Date(),
                // 封存狀態
                archive: {
                    is_archived: false,
                    reason: "",
                },
            });

            const nonNilExperience = omitBy(experience, isNil);

            const experience_model = new ExperienceModel(db);

            // insert data into experiences collection
            await experience_model.createExperience(nonNilExperience);

            // update user email & subscribeEmail, if email field exists
            if (experience.email) {
                const user_model = new UserModel(manager);
                await user_model.updateSubscribeEmail(
                    user._id,
                    experience.email
                );
            }

            return {
                success: true,
                experience: nonNilExperience,
            };
        },
        async createWorkExperience(root, { input }, { db, user, manager }) {
            const experience = input;

            validationWorkInputFields(experience);

            const company_model = manager.CompanyModel;

            const company = await helper.getCompanyByIdOrQuery(
                company_model,
                input.company.id,
                input.company.query
            );
            experience.company = company;
            experience.job_title = experience.job_title.toUpperCase();

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

            Object.assign(experience, {
                type: "work",
                author_id: user._id,
                like_count: 0,
                reply_count: 0,
                report_count: 0,
                status: "published",
                // TODO 瀏覽次數？
                created_at: new Date(),
                // 封存狀態
                archive: {
                    is_archived: false,
                    reason: "",
                },
            });

            const nonNilExperience = omitBy(experience, isNil);

            const experience_model = new ExperienceModel(db);

            await experience_model.createExperience(nonNilExperience);
            if (experience.email) {
                const user_model = new UserModel(manager);
                await user_model.updateSubscribeEmail(
                    user._id,
                    experience.email
                );
            }

            return {
                success: true,
                experience: nonNilExperience,
            };
        },
    },
};

const types = [Type, Query, Mutation];

module.exports = {
    resolvers,
    types,
};
