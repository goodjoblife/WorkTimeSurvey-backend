const { assert } = require("chai");
const app = require("../../../app");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../../models/connect");
const request = require("supertest");
const { FakeUserFactory } = require("../../../utils/test_helper");

describe("GET /me/replies", () => {
    let db;
    let experience_1_id;
    let experience_2_id;
    const fake_user_factory = new FakeUserFactory();
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
    let fake_other_user_token;

    before(async () => {
        ({ db } = await connectMongo());
    });

    before(async () => {
        await fake_user_factory.setUp();
    });

    before("Create some users", async () => {
        fake_user_token = await fake_user_factory.create(fake_user);
        fake_other_user_token = await fake_user_factory.create(fake_other_user);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    before("Seed experiences", async () => {
        const result = await db.collection("experiences").insertMany([
            {
                type: "work",
                title: "my work experience",
            },
            {
                type: "interview",
                title: "my interview experience",
            },
        ]);

        experience_1_id = result.insertedIds[0];
        experience_2_id = result.insertedIds[1];
    });

    before("Seed replies", async () => {
        const replies = [
            {
                content: "first reply",
                experience_id: experience_1_id,
                author_id: fake_user._id,
                like_count: 0,
                report_count: 0,
                created_at: new Date("2017-08-01T08:00:00.000Z"),
                floor: 1,
                status: "hidden",
            },
            {
                content: "second reply",
                experience_id: experience_2_id,
                author_id: fake_user._id,
                like_count: 0,
                report_count: 0,
                created_at: new Date("2017-08-01T08:10:00.000Z"),
                floor: 3,
                status: "published",
            },
            {
                content: "other reply",
                experience_id: experience_1_id,
                author_id: new ObjectId(),
                like_count: 0,
                report_count: 0,
                created_at: new Date("2017-08-01T08:10:00.000Z"),
                floor: 3,
                status: "hidden",
            },
        ];
        await db.collection("replies").insertMany(replies);
    });

    it("should get his/her replies", async () => {
        const res = await request(app)
            .get(`/me/replies`)
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        // ensure the format is correct
        assert.propertyVal(res.body, "total", 2);
        assert.property(res.body, "replies");
        assert.lengthOf(res.body.replies, 2);
        assert.deepProperty(res.body, "replies.0._id");
        assert.deepProperty(res.body, "replies.0.content");
        assert.deepProperty(res.body, "replies.0.like_count");
        assert.deepProperty(res.body, "replies.0.report_count");
        assert.deepProperty(res.body, "replies.0.created_at");
        assert.deepProperty(res.body, "replies.0.floor");
        assert.deepProperty(res.body, "replies.0.status");
        assert.deepProperty(res.body, "replies.0.experience");
        assert.deepProperty(res.body, "replies.0.experience._id");
        assert.deepProperty(res.body, "replies.0.experience.title");
        assert.notDeepProperty(res.body, "replies.0.author_id");
        assert.notDeepProperty(res.body, "replies.0.experience.author_id");

        // ensure the order is reverse of created_at
        assert.deepPropertyVal(res.body, "replies.0.content", "second reply");
        assert.deepPropertyVal(
            res.body,
            "replies.0.experience.title",
            "my interview experience"
        );
        assert.deepPropertyVal(res.body, "replies.1.content", "first reply");
        assert.deepPropertyVal(
            res.body,
            "replies.1.experience.title",
            "my work experience"
        );
    });

    it("should get no replies when user does not have replies", async () => {
        const res = await request(app)
            .get(`/me/replies`)
            .set("Authorization", `Bearer ${fake_other_user_token}`)
            .expect(200);

        assert.propertyVal(res.body, "total", 0);
        assert.property(res.body, "replies");
        assert.lengthOf(res.body.replies, 0);
    });

    it("should return 422, when limit > 100", () =>
        request(app)
            .get(`/me/replies`)
            .query({
                limit: "101",
            })
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(422));

    it("should retun 422, when start < 0", () =>
        request(app)
            .get(`/me/replies`)
            .query({
                start: "-5",
            })
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(422));

    it("should return 401, if not authenticated", () =>
        request(app)
            .get(`/me/replies`)
            .expect(401));

    after(() => db.collection("experiences").deleteMany({}));

    after(() => db.collection("replies").deleteMany({}));
});
