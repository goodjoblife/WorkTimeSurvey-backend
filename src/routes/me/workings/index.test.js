const assert = require("chai").assert;
const app = require("../../../app");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../../models/connect");
const request = require("supertest");
const { generateWorkingData } = require("../../experiences/testData");
const { FakeUserFactory } = require("../../../utils/test_helper");

describe("Get /me/workings ", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    let user_working_id_str;
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

    before("Create Data", async () => {
        const user_working = Object.assign(generateWorkingData(), {
            author: {
                type: "facebook",
                id: fake_user.facebook_id,
            },
        });

        const other_user_working = Object.assign(generateWorkingData(), {
            author: {
                type: "facebook",
                id: fake_other_user.facebook_id,
            },
        });

        const workings = await db
            .collection("workings")
            .insertMany([user_working, other_user_working]);
        user_working_id_str = workings.insertedIds[0].toString();
    });

    it("should be currect fields ", async () => {
        const res = await request(app)
            .get(`/me/workings`)
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 200);
        assert.property(res.body, "total");
        assert.property(res.body, "time_and_salary");
        assert.property(res.body.time_and_salary[0], "_id");
        assert.property(res.body.time_and_salary[0], "company");
        assert.property(res.body.time_and_salary[0], "sector");
        assert.property(res.body.time_and_salary[0], "created_at");
        assert.property(res.body.time_and_salary[0], "data_time");
        assert.property(res.body.time_and_salary[0], "estimated_hourly_wage");
        assert.property(res.body.time_and_salary[0], "job_title");
        assert.property(res.body.time_and_salary[0], "overtime_frequency");
        assert.property(res.body.time_and_salary[0], "salary");
        assert.property(res.body.time_and_salary[0], "week_work_time");
        assert.property(res.body.time_and_salary[0], "status");
    });

    it("should get workings of user and total equal 1 ", async () => {
        const res = await request(app)
            .get(`/me/workings`)
            .set("Authorization", `Bearer ${fake_user_token}`);

        assert.equal(res.status, 200);
        const workings = res.body.time_and_salary;
        assert.lengthOf(workings, 1);
        assert.equal(workings[0]._id, user_working_id_str);
    });

    it("should be error, when not authenticated", async () => {
        const res = await request(app).get(`/me/workings`);

        assert.equal(res.status, 401);
    });

    after(() => db.collection("workings").deleteMany({}));
});
