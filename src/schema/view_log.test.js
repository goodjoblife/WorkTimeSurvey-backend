const { assert } = require("chai");
const request = require("supertest");
const { ObjectId } = require("mongodb");
const app = require("../app");
const { connectMongo } = require("../models/connect");
const ModelManager = require("../models/manager");
const {
    SALARY_WORK_TIME_TYPE,
    EXPERIENCE_TYPE,
} = require("../models/view_log_model");
const { FakeUserFactory } = require("../utils/test_helper");

describe("View logs", () => {
    let manager;
    const fake_user_factory = new FakeUserFactory();

    let fake_user = {
        name: "mark",
        facebook_id: "-1",
    };
    let fake_user_token;

    before(async () => {
        const { db } = await connectMongo();
        manager = new ModelManager(db);
    });

    afterEach(async () => {
        await manager.ViewLogModel.collection.deleteMany();
    });

    before(async () => {
        await fake_user_factory.setUp();
        fake_user_token = await fake_user_factory.create(fake_user);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    it("Mutation.viewSalaryWorkTimes", async () => {
        const content_ids = [new ObjectId(), new ObjectId()];
        const referrer = "https://www-dev.goodjob.life";
        const payload = {
            query: `
                mutation ViewSalaryWorkTimes($input: ViewSalaryWorkTimesInput!) {
                    viewSalaryWorkTimes(input: $input) {
                        status
                    }
                }
            `,
            variables: {
                input: {
                    content_ids,
                    referrer,
                },
            },
        };

        await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        // 檢查 DB 內的欄位
        const logs = await manager.ViewLogModel.collection.find().toArray();
        assert.equal(logs.length, 2);
        assert.isTrue(logs[0].user_id.equals(fake_user._id));
        assert.propertyVal(logs[0], "content_type", SALARY_WORK_TIME_TYPE);
        assert.propertyVal(logs[0], "referrer", referrer);
    });

    it("Mutation.viewExperiences", async () => {
        const content_ids = [new ObjectId(), new ObjectId()];
        const referrer = "https://www-dev.goodjob.life";
        const payload = {
            query: `
                mutation ViewExperiences($input: ViewExperiencesInput!) {
                    viewExperiences(input: $input) {
                        status
                    }
                }
            `,
            variables: {
                input: {
                    content_ids,
                    referrer,
                },
            },
        };

        await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        // 檢查 DB 內的欄位
        const logs = await manager.ViewLogModel.collection.find().toArray();

        assert.equal(logs.length, 2);
        assert.isTrue(logs[0].user_id.equals(fake_user._id));
        assert.propertyVal(logs[0], "content_type", EXPERIENCE_TYPE);
        assert.propertyVal(logs[0], "referrer", referrer);
    });
});
