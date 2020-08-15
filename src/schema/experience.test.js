const chai = require("chai");
const request = require("supertest");
const ObjectId = require("mongodb").ObjectId;
const { connectMongo } = require("../models/connect");
const { FakeUserFactory } = require("../utils/test_helper");

const {
    UserPointEvent,
    COMPLETED,
} = require("../models/schemas/userPointEvent");
const {
    createInterviewExperience,
    createWorkExperience,
} = require("../libs/events/EventType");
const taskConfig = require("../libs/events/task_config");

chai.use(require("chai-subset"));
const { assert, expect } = chai;
const app = require("../app");

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

describe("Mutation createInterviewExperience", () => {
    const INIT_POINTS = 1000;
    const user_id = ObjectId();
    const fake_user_factory = new FakeUserFactory();
    let db;
    let token;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        await fake_user_factory.setUp();
        token = await fake_user_factory.create({
            _id: user_id,
            name: "mark",
            facebook_id: "facebook_id",
            points: INIT_POINTS,
        });
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    it("should success", async () => {
        // TODO
    });

    it("should create userPointEvent and update user.points", async () => {
        const payload = {
            query: /* GraphQL */ `
                mutation CreateInterviewExperience(
                    $input: CreateInterviewExperienceInput!
                ) {
                    createInterviewExperience(input: $input) {
                        success
                        experience {
                            id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    company: { query: "古嘉博股份有限公司" },
                    region: "臺北市",
                    job_title: "打工仔",
                    title: "我是標題",
                    sections: [
                        {
                            subtitle: "我思故我在",
                            content: "1234567890123456789012345678901234567890",
                        },
                        {
                            subtitle: "白努力定律",
                            content: "1234567890123456789012345678901234567890",
                        },
                    ],
                    experience_in_year: 3,
                    education: "大學",
                    interview_time: {
                        year: 2020,
                        month: 8,
                    },
                    interview_result: "錄取",
                    salary: {
                        type: "year",
                        amount: 1000000,
                    },
                    overall_rating: 5,
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        assert.equal(res.body.errors, undefined);

        // 檢查使用者點數是否有增加
        const user = await db.collection("users").findOne({ _id: user_id });
        assert.equal(
            user.points,
            INIT_POINTS + taskConfig[createInterviewExperience].points
        );

        // 檢查 userPointEvent
        const events = await UserPointEvent.find({
            user_id: user_id,
            event_name: createInterviewExperience,
            //TO FIX: doc_id: docId,
        });
        assert.isNotNull(events);
        assert.lengthOf(events, 1);
        assert.propertyVal(events[0], "status", COMPLETED);
        assert.propertyVal(
            events[0],
            "points",
            taskConfig[createInterviewExperience].points
        );
    });
});

describe("Mutation createWorkExperience", () => {
    const INIT_POINTS = 1000;
    const user_id = ObjectId();
    const fake_user_factory = new FakeUserFactory();
    let db;
    let token;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        await fake_user_factory.setUp();
        token = await fake_user_factory.create({
            _id: user_id,
            name: "mark",
            facebook_id: "facebook_id",
            points: INIT_POINTS,
        });
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    it("should success", async () => {
        // TODO
    });

    it("should create userPointEvent and update user.points", async () => {
        const payload = {
            query: /* GraphQL */ `
                mutation CreateWorkExperience(
                    $input: CreateWorkExperienceInput!
                ) {
                    createWorkExperience(input: $input) {
                        success
                        experience {
                            id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    company: { query: "古嘉博股份有限公司" },
                    region: "臺北市",
                    job_title: "打工仔",
                    title: "我是標題",
                    sections: [
                        {
                            subtitle: "我思故我在",
                            content: "1234567890123456789012345678901234567890",
                        },
                        {
                            subtitle: "白努力定律",
                            content: "1234567890123456789012345678901234567890",
                        },
                    ],
                    experience_in_year: 3,
                    education: "大學",
                    salary: {
                        type: "year",
                        amount: 1000000,
                    },
                    week_work_time: 40,
                    recommend_to_others: "yes",
                    is_currently_employed: "yes",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        assert.equal(res.body.errors, undefined);

        // 檢查使用者點數是否有增加
        const user = await db.collection("users").findOne({ _id: user_id });
        assert.equal(
            user.points,
            INIT_POINTS + taskConfig[createWorkExperience].points
        );

        // 檢查 userPointEvent
        const events = await UserPointEvent.find({
            user_id: user_id,
            event_name: createWorkExperience,
            //TO FIX: doc_id: docId,
        });
        assert.isNotNull(events);
        assert.lengthOf(events, 1);
        assert.propertyVal(events[0], "status", COMPLETED);
        assert.propertyVal(
            events[0],
            "points",
            taskConfig[createWorkExperience].points
        );
    });
});
