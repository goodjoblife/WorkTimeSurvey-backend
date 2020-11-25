const { ObjectId } = require("mongodb");
const { connectMongo } = require("../models/connect");
const ModelManager = require("../models/manager");
const jwt = require("../utils/jwt");

class FakeUserFactory {
    async setUp() {
        const { client, db } = await connectMongo();
        const manager = new ModelManager(db);
        this.client = client;
        this.user_model = manager.UserModel;
    }

    async create(user) {
        await this.user_model.collection.insertOne(user);
        const token = await jwt.sign({ user_id: user._id });
        return token;
    }

    async tearDown() {
        await this.user_model.collection.drop();
        await this.client.close();
    }
}

const defaultWorkExperienceTestData = {
    type: "work",
    created_at: new Date(),
    author_id: new ObjectId(),
    region: "臺北市",
    job_title: "job_title_example",
    title: "title_example",
    company: {
        id: "111",
        name: "goodjob",
    },
    sections: [
        {
            subtitle: "subtitle1",
            content: "content1",
        },
    ],
    experience_in_year: 10,
    education: "大學",
    like_count: 0,
    reply_count: 0,
    report_count: 0,
    status: "published",
    is_currently_employed: "no",
    job_ending_time: {
        year: 2017,
        month: 10,
    },
    salary: {
        type: "year",
        amount: 100000,
    },
    week_work_time: 40,
    data_time: {
        year: 2017,
        month: 10,
    },
    recommend_to_others: "yes",
    archive: {
        is_archived: false,
        reason: "",
    },
};
class FakeWorkExperienceFactory {
    async setUp() {
        const { client, db } = await connectMongo();
        const manager = new ModelManager(db);
        this.client = client;
        this.model = manager.WorkExperienceModel;
    }

    async create(workExperience) {
        return await this.model.collection.insertOne(workExperience);
    }

    async createWithDefault(workExperience) {
        return await this.model.collection.insertOne({
            ...defaultWorkExperienceTestData,
            ...workExperience,
        });
    }

    async tearDown() {
        await this.model.collection.drop();
        await this.client.close();
    }
}

const defaultInterviewExperieneceTestData = {
    type: "interview",
    created_at: new Date(),
    author_id: new ObjectId(),
    region: "臺北市",
    job_title: "job_title_example",
    title: "title_example",
    company: {
        id: "111",
        name: "goodjob",
    },
    sections: [
        {
            subtitle: "subtitle1",
            content: "content1",
        },
    ],
    experience_in_year: 10,
    education: "大學",
    // Interview Experience related
    interview_time: {
        year: 2017,
        month: 3,
    },
    interview_qas: [
        {
            question: "qas1",
            answer: "ans1",
        },
    ],
    interview_sensitive_questions: ["You are so handsome ~"],
    interview_result: "up",
    salary: {
        type: "year",
        amount: 10000,
    },
    overall_rating: 5,
    like_count: 0,
    reply_count: 0,
    report_count: 0,
    status: "published",
    archive: {
        is_archived: false,
        reason: "",
    },
};
class FakeInterviewExperienceFactory {
    async setUp() {
        const { client, db } = await connectMongo();
        const manager = new ModelManager(db);
        this.client = client;
        this.model = manager.InterviewExperienceModel;
    }

    async create(interviewExperience) {
        return await this.model.collection.insertOne(interviewExperience);
    }

    async createWithDefault(interviewExperience) {
        return await this.model.collection.insertOne({
            ...defaultInterviewExperieneceTestData,
            ...interviewExperience,
        });
    }

    async tearDown() {
        await this.model.collection.drop();
        await this.client.close();
    }
}

const defaultSalaryWorkTimeTestData = {
    created_at: new Date(),
    user_id: new ObjectId(),
    company: {
        id: "123456789",
        name: "goodjob",
    },
    job_title: "BackEnd Devdeloper",
    sector: "台灣區",
    gender: "M",
    is_currently_employed: "no",
    employment_type: "xxxx",
    week_work_time: 40,
    overtime_frequency: 3,
    day_promised_work_time: 8,
    day_real_work_time: 12,
    has_overtime_salary: "yes",
    has_compensatory_dayoff: "yes",
    experience_in_year: 10,
    salary: {
        type: "day",
        amount: 122,
    },
    estimated_hourly_wage: 122,
    data_time: {
        year: 2016,
        month: 1,
    },
    recommended_by: new ObjectId(),
    status: "published",
    archive: {
        is_archived: false,
        reason: "",
    },
};

class FakeSalaryWorkTimeFactory {
    async setUp() {
        const { client, db } = await connectMongo();
        const manager = new ModelManager(db);
        this.client = client;
        this.model = manager.SalaryWorkTimeModel;
    }

    async create(salaryWorkTime) {
        return await this.model.collection.insertOne(salaryWorkTime);
    }

    async createWithDefault(salaryWorkTime) {
        return await this.model.collection.insertOne({
            ...defaultSalaryWorkTimeTestData,
            ...salaryWorkTime,
        });
    }

    async tearDown() {
        await this.model.collection.drop();
        await this.client.close();
    }
}

module.exports = {
    FakeUserFactory,
    FakeWorkExperienceFactory,
    FakeInterviewExperienceFactory,
    FakeSalaryWorkTimeFactory,
};
