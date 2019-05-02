const assert = require("chai").assert;
const app = require("../../../app");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../../models/connect");
const request = require("supertest");
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require("../../experiences/testData");
const { FakeUserFactory } = require("../../../utils/test_helper");

describe("Experiences of Author Test", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    let user_interview_experience_id;
    let user_work_experience_id;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "markLin",
        },
    };

    const fake_other_user = {
        _id: new ObjectId(),
        facebook_id: "-2",
        facebook: {
            id: "-2",
            name: "markLin002",
        },
    };
    let fake_user_token;

    before(async () => {
        ({ db } = await connectMongo());
    });

    before(async () => {
        await fake_user_factory.setUp();
    });

    before("Create some users", async () => {
        fake_user_token = await fake_user_factory.create(fake_user);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    before("Create Data", () => {
        const user_work_experience = Object.assign(
            generateWorkExperienceData(),
            {
                status: "published",
                author_id: fake_user._id,
            }
        );

        const user_interview_experience = Object.assign(
            generateInterviewExperienceData(),
            {
                status: "published",
                author_id: fake_user._id,
            }
        );

        const other_user_interview_experiencep = Object.assign(
            generateInterviewExperienceData(),
            {
                status: "published",
                author_id: fake_other_user._id,
            }
        );

        return db
            .collection("experiences")
            .insertMany([
                user_work_experience,
                user_interview_experience,
                other_user_interview_experiencep,
            ])
            .then(result => {
                user_work_experience_id = result.insertedIds[0];
                user_interview_experience_id = result.insertedIds[1];
            });
    });

    it("should be success, when the author get him experiences", async () => {
        const res = await request(app)
            .get(`/me/experiences`)
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 200);
        const experiences = res.body.experiences;
        const work_experience = experiences.find(
            experience => experience.type === "work"
        );
        const interview_experience = experiences.find(
            experience => experience.type === "interview"
        );
        assert.equal(work_experience._id, user_work_experience_id);
        assert.equal(interview_experience._id, user_interview_experience_id);
    });

    it("should get user work experiences ", async () => {
        const res = await request(app)
            .get(`/me/experiences`)
            .query({
                type: "work",
            })
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 200);
        const experiences = res.body.experiences;
        assert.lengthOf(experiences, 1);
        assert.equal(experiences[0]._id, user_work_experience_id);
    });

    it("should get user work and interview experiences", async () => {
        const res = await request(app)
            .get(`/me/experiences`)
            .query({
                type: "work,interview",
            })
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 200);
        assert.lengthOf(res.body.experiences, 2);
    });

    it("should be error 422, when limit > 100", async () => {
        const res = await request(app)
            .get(`/me/experiences`)
            .query({
                limit: 150,
            })
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 422);
    });

    it("should be error, when start < 0", async () => {
        const res = await request(app)
            .get(`/me/experiences`)
            .query({
                start: -5,
            })
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 422);
    });

    it("should be error, when not authenticated", async () => {
        const res = await request(app).get(`/me/experiences`);

        assert.equal(res.status, 401);
    });

    after(() => db.collection("experiences").deleteMany({}));
});
