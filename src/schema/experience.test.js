const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const request = require("supertest");
const ObjectId = require("mongodb").ObjectId;
const { connectMongo } = require("../models/connect");

chai.use(require("chai-subset"));
chai.use(chaiAsPromised);

const { assert, expect } = chai;
const app = require("../app");

const { FakeUserFactory } = require("../utils/test_helper");

describe("Query popular_experiences", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    before(() =>
        db.collection("experiences").insertMany([
            {
                created_at: new Date(),
                type: "work",
                title: "ugly",
                sections: [
                    {
                        content: "我很醜",
                    },
                ],
                status: "published",
                archive: {
                    is_archived: false,
                },
            },
            {
                created_at: new Date(),
                type: "work",
                title: "gentle",
                sections: [
                    {
                        content: "可是我很溫柔",
                    },
                ],
                status: "published",
                archive: {
                    is_archived: false,
                },
            },
            {
                created_at: new Date(),
                type: "work",
                title: "cold",
                sections: [
                    {
                        content: "外表冷漠",
                    },
                ],
                status: "published",
                archive: {
                    is_archived: false,
                },
            },
            {
                created_at: new Date(new Date() - 100 * 24 * 60 * 60 * 1000),
                type: "work",
                title: "hot",
                sections: [
                    {
                        content: "內心狂熱",
                    },
                ],
                status: "published",
                archive: {
                    is_archived: false,
                },
            },
        ])
    );

    it("will return experiences in thirty days", async () => {
        const payload = {
            query: `{
                    popular_experiences(returnNumber: 4, sampleNumber: 4) {
                        id
                        title
                    }
                }`,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        const { popular_experiences } = res.body.data;

        assert.isArray(popular_experiences);
        assert.lengthOf(popular_experiences, 3);
        expect(popular_experiences).containSubset([{ title: "cold" }]);
        expect(popular_experiences).to.not.containSubset([{ title: "hot" }]);
    });

    it("will experiences with most number of words", async () => {
        const payload = {
            query: `{
                    popular_experiences(returnNumber: 2, sampleNumber: 2) {
                        id
                        title
                    }
                }`,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        const { popular_experiences } = res.body.data;

        assert.isArray(popular_experiences);
        assert.lengthOf(popular_experiences, 2);
        expect(popular_experiences).containSubset([{ title: "cold" }]);
        expect(popular_experiences).containSubset([{ title: "gentle" }]);
    });

    after(async () => {
        return db.collection("experiences").deleteMany({});
    });
});

function generateCreateWorkExperiencePayload(options) {
    const opt = options || {};
    const valid = {
        company: {
            query: "00000001",
        },
        region: "臺北市",
        job_title: "job_title_example",
        title: "title_example",
        sections: [
            {
                subtitle: "subtitle1",
                content: "content1",
            },
        ],
        experience_in_year: 10,
        education: "大學",
        // Work Experience related
        is_currently_employed: "no",
        job_ending_time: {
            year: 2017,
            month: 4,
        },
        salary: {
            type: "year",
            amount: 10000,
        },
        week_work_time: 40,
        recommend_to_others: "yes",
        email: "test@goodjob.org",
    };

    const payload = {};
    for (const key in valid) {
        if (opt[key]) {
            if (opt[key] !== -1) {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (const key in opt) {
        if (opt[key] !== -1) {
            payload[key] = opt[key];
        }
    }

    return {
        query: `
            mutation CreateWorkExperience($input: CreateWorkExperienceInput!) {
                createWorkExperience(input: $input) {
                    success
                    experience {
                        id
                        type
                        company {
                            name
                        }
                        job_title {
                            name
                        }
                        region
                        experience_in_year
                        education
                        salary {
                            type
                            amount
                        }
                        title
                        sections {
                            subtitle
                            content
                        }
                        created_at
                        reply_count
                        report_count
                        like_count
                        status

                        liked
                        data_time {
                            year
                            month
                        }
                        week_work_time
                        recommend_to_others
                    }
                }
            }
        `,
        variables: {
            input: payload,
        },
    };
}

describe("mutation CreateWorkExperience", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "markLin",
        },
    };
    let fake_user_token;
    const API_ENDPOINT = "/graphql";

    before(async () => {
        ({ db } = await connectMongo());
        await db.collection("companies").insertMany([
            {
                id: "00000001",
                name: "GOODJOB",
            },
            {
                id: "00000002",
                name: "GOODJOBGREAT",
            },
            {
                id: "00000003",
                name: "GOODJOBGREAT",
            },
        ]);
    });

    beforeEach(async () => {
        await fake_user_factory.setUp();
    });

    beforeEach("Create some users", async () => {
        fake_user_token = await fake_user_factory.create(fake_user);
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    after(async () => {
        await db.collection("experiences").deleteMany({});
        await db.collection("companies").deleteMany({});
    });

    it("should successfully create work experience", async () => {
        const res = await request(app)
            .post(API_ENDPOINT)
            .send(generateCreateWorkExperiencePayload())
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        const resData = res.body.data.createWorkExperience;

        const experience = await db
            .collection("experiences")
            .findOne({ _id: ObjectId(resData.experience.id) });

        // expected fields in db
        assert.equal(experience.type, "work");
        assert.deepEqual(experience.author_id, fake_user._id);
        assert.deepEqual(experience.company, {
            id: "00000001",
            name: "GOODJOB",
        });
        assert.equal(experience.region, "臺北市");
        assert.equal(experience.job_title, "JOB_TITLE_EXAMPLE");
        assert.equal(experience.title, "title_example");
        assert.deepEqual(experience.sections, [
            {
                subtitle: "subtitle1",
                content: "content1",
            },
        ]);
        assert.equal(experience.experience_in_year, 10);
        assert.equal(experience.education, "大學");
        assert.equal(experience.is_currently_employed, "no");
        assert.deepEqual(experience.job_ending_time, {
            year: 2017,
            month: 4,
        });
        assert.deepEqual(experience.salary, {
            type: "year",
            amount: 10000,
        });
        assert.equal(experience.week_work_time, 40);
        assert.equal(experience.recommend_to_others, "yes");
        assert.deepEqual(experience.like_count, 0);
        assert.deepEqual(experience.reply_count, 0);
        assert.deepEqual(experience.report_count, 0);
        assert.property(experience, "created_at");
        assert.property(experience, "data_time");
        assert.deepEqual(experience.status, "published");

        assert.equal(experience.archive.is_archived, false);
        assert.equal(experience.archive.reason, "");

        const user = await db
            .collection("users")
            .findOne({ _id: fake_user._id });
        assert.equal(user.subscribeEmail, true);
        assert.equal(user.email, experience.email);

        // expected response
        assert.property(resData, "success");
        assert.equal(resData.success, true);
        assert.deepProperty(resData, "experience.id");
    });

    describe("Validation Part", () => {
        describe("salary part", () => {
            const salaryRanges = [
                {
                    type: "hour",
                    min: 10,
                    max: 10000,
                },
                {
                    type: "day",
                    min: 100,
                    max: 120000,
                },
                {
                    type: "month",
                    min: 1000,
                    max: 1000000,
                },
                {
                    type: "year",
                    min: 10000,
                    max: 12000000,
                },
            ];
            for (let salary of salaryRanges) {
                const { max, min, type } = salary;
                it(`should fail if type=${type} and amount<${min}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateWorkExperiencePayload({
                                salary: {
                                    type,
                                    amount: min - 1,
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.property(res.body, "errors");
                });

                it(`should fail if type=${type} and amount>${max}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateWorkExperiencePayload({
                                salary: {
                                    type,
                                    amount: max + 1,
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.property(res.body, "errors");
                });

                it(`should success if type=${type} and amount>=${min} and <=${max}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateWorkExperiencePayload({
                                salary: {
                                    type,
                                    amount: Math.round(min + max / 2),
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.notProperty(res.body, "errors");
                });
            }
        });

        describe("week_work_time part", () => {
            it("week_work_time should be positive number", async () => {
                const res = await request(app)
                    .post(API_ENDPOINT)
                    .send(
                        generateCreateWorkExperiencePayload({
                            week_work_time: -10,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.property(res.body, "errors");
            });
        });

        describe("data_time part", () => {
            it('data_time\'s year & month should be today if is_currently_employed is "yes"', async () => {
                const res = await request(app)
                    .post(API_ENDPOINT)
                    .send(
                        generateCreateWorkExperiencePayload({
                            is_currently_employed: "yes",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);

                const resData = res.body.data.createWorkExperience;

                const experience = await db.collection("experiences").findOne({
                    _id: ObjectId(resData.experience.id),
                });

                const now = new Date();
                assert.deepEqual(experience.data_time, {
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                });
            });

            it('data_time should be job_ending_time if is_currently_employed is "no"', async () => {
                const res = await request(app)
                    .post(API_ENDPOINT)
                    .send(
                        generateCreateWorkExperiencePayload({
                            is_currently_employed: "no",
                            job_ending_time: {
                                year: 2017,
                                month: 4,
                            },
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);

                const resData = res.body.data.createWorkExperience;
                const experience = await db.collection("experiences").findOne({
                    _id: ObjectId(resData.experience.id),
                });

                assert.deepEqual(experience.data_time, {
                    year: 2017,
                    month: 4,
                });
            });
        });
    });

    describe("Authentication Part", () => {
        it("should fail to create work experience", async () => {
            const res = await request(app)
                .post(API_ENDPOINT)
                .send(generateCreateWorkExperiencePayload())
                .expect(200);
            assert.property(res.body, "errors");
        });
    });
});

function generateCreateInterviewExperiencePayload(options) {
    const opt = options || {};
    const valid = {
        company: {
            query: "00000001",
        },
        region: "臺北市",
        job_title: "job_title_example",
        title: "title_example",
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
        interview_result: "up",
        salary: {
            type: "year",
            amount: 10000,
        },
        overall_rating: 5,
        email: "test@goodjob.org",
    };

    const payload = {};
    for (const key in valid) {
        if (opt[key]) {
            if (opt[key] !== -1) {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (const key in opt) {
        if (opt[key] !== -1) {
            payload[key] = opt[key];
        }
    }
    return {
        query: `
            mutation CreateInterviewExperience($input: CreateInterviewExperienceInput!) {
                createInterviewExperience(input: $input) {
                    success
                    experience {
                        id
                        type
                        company {
                            name
                        }
                        job_title {
                            name
                        }
                        region
                        experience_in_year
                        education
                        salary {
                            type
                            amount
                        }
                        title
                        sections {
                            subtitle
                            content
                        }
                        created_at
                        reply_count
                        report_count
                        like_count
                        status

                        liked

                        interview_time {
                            year
                            month
                        }
                        interview_result
                        overall_rating
                        interview_qas {
                            question
                            answer
                        }
                        interview_sensitive_questions
                    }
                }
            }
        `,
        variables: {
            input: payload,
        },
    };
}

describe("mutation CreateInterviewExperience", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "markLin",
        },
    };
    let fake_user_token;
    const API_ENDPOINT = "/graphql";

    before(async () => {
        ({ db } = await connectMongo());
        await db.collection("companies").insertMany([
            {
                id: "00000001",
                name: "GOODJOB",
            },
            {
                id: "00000002",
                name: "GOODJOBGREAT",
            },
            {
                id: "00000003",
                name: "GOODJOBGREAT",
            },
        ]);
    });

    beforeEach(async () => {
        await fake_user_factory.setUp();
    });

    beforeEach("Create some users", async () => {
        fake_user_token = await fake_user_factory.create(fake_user);
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    after(async () => {
        await db.collection("experiences").deleteMany({});
        await db.collection("companies").deleteMany({});
    });

    it("should successfully create interview experience", async () => {
        const res = await request(app)
            .post(API_ENDPOINT)
            .send(generateCreateInterviewExperiencePayload())
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        const resData = res.body.data.createInterviewExperience;

        const experience = await db
            .collection("experiences")
            .findOne({ _id: ObjectId(resData.experience.id) });

        // expected fields in db
        assert.equal(experience.type, "interview");
        assert.deepEqual(experience.author_id, fake_user._id);
        assert.deepEqual(experience.company, {
            id: "00000001",
            name: "GOODJOB",
        });
        assert.equal(experience.region, "臺北市");
        assert.equal(experience.job_title, "JOB_TITLE_EXAMPLE");
        assert.equal(experience.title, "title_example");
        assert.deepEqual(experience.sections, [
            {
                subtitle: "subtitle1",
                content: "content1",
            },
        ]);
        assert.equal(experience.experience_in_year, 10);
        assert.equal(experience.education, "大學");
        assert.deepEqual(experience.interview_time, {
            year: 2017,
            month: 3,
        });
        assert.deepEqual(experience.interview_qas, [
            { question: "qas1", answer: "ans1" },
        ]);
        assert.deepEqual(experience.interview_result, "up");
        assert.deepEqual(experience.interview_sensitive_questions, []);
        assert.deepEqual(experience.salary, {
            type: "year",
            amount: 10000,
        });
        assert.deepEqual(experience.overall_rating, 5);
        assert.deepEqual(experience.like_count, 0);
        assert.deepEqual(experience.reply_count, 0);
        assert.deepEqual(experience.report_count, 0);
        assert.deepEqual(experience.status, "published");
        assert.property(experience, "created_at");

        assert.equal(experience.archive.is_archived, false);
        assert.equal(experience.archive.reason, "");

        const user = await db
            .collection("users")
            .findOne({ _id: fake_user._id });
        assert.equal(user.subscribeEmail, true);
        assert.equal(user.email, experience.email);

        // expected response
        assert.property(resData, "success");
        assert.equal(resData.success, true);
        assert.deepProperty(resData, "experience.id");
    });

    describe("Validation Part", () => {
        describe("salary part", () => {
            const salaryRanges = [
                {
                    type: "hour",
                    min: 10,
                    max: 10000,
                },
                {
                    type: "day",
                    min: 100,
                    max: 120000,
                },
                {
                    type: "month",
                    min: 1000,
                    max: 1000000,
                },
                {
                    type: "year",
                    min: 10000,
                    max: 12000000,
                },
            ];
            for (let salary of salaryRanges) {
                const { max, min, type } = salary;
                it(`should fail if type=${type} and amount<${min}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateInterviewExperiencePayload({
                                salary: {
                                    type,
                                    amount: min - 1,
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.property(res.body, "errors");
                });

                it(`should fail if type=${type} and amount>${max}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateInterviewExperiencePayload({
                                salary: {
                                    type,
                                    amount: max + 1,
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.property(res.body, "errors");
                });

                it(`should success if type=${type} and amount>=${min} and <=${max}`, async () => {
                    const res = await request(app)
                        .post(API_ENDPOINT)
                        .send(
                            generateCreateInterviewExperiencePayload({
                                salary: {
                                    type,
                                    amount: Math.round(min + max / 2),
                                },
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                    assert.notProperty(res.body, "errors");
                });
            }
        });
    });

    describe("Authentication Part", () => {
        it("should fail to create interview experience", async () => {
            const res = await request(app)
                .post(API_ENDPOINT)
                .send(generateCreateInterviewExperiencePayload())
                .expect(200);
            assert.property(res.body, "errors");
        });
    });
});
