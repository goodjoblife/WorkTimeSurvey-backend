const { assert } = require("chai");
const request = require("supertest");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const sinon = require("sinon");

const app = require("../../app");
const authentication = require("../../libs/authentication");
const { generateReplyData } = require("../experiences/testData");
const create_capped_collection = require("../../database/migrations/migration-2017-09-08-create-popularExperienceLogs-collection");

describe("Replies Test", () => {
    let db;
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
            name: "markChen",
        },
    };

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("POST /experiences/:id/replies", () => {
        let experience_id;
        let sandbox;

        const path = experience_id_string =>
            `/experiences/${experience_id_string}/replies`;

        beforeEach("Stub", () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(
                authentication,
                "cachedFacebookAuthentication"
            );

            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeaccesstoken"
                )
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, "wrongToken")
                .rejects();
        });

        beforeEach("Seed experiences collection", async () => {
            const experience = {
                type: "interview",
                author_id: new ObjectId(),
                reply_count: 0,
                report_count: 0,
            };

            const result = await db
                .collection("experiences")
                .insertOne(experience);
            experience_id = result.insertedId;
        });

        it("should insert one log", async () => {
            await request(app)
                .post(`/experiences/${experience_id}/replies`)
                .send({
                    access_token: "fakeaccesstoken",
                    content: "你好我是大留言",
                });

            const result = await db
                .collection("popular_experience_logs")
                .find({ experience_id })
                .toArray();

            assert.lengthOf(result, 1);
            assert.equal(result[0].action_type, "reply");
        });

        it("should 200 Success if succeed", async () => {
            const res = await request(app)
                .post(path(experience_id))
                .send({
                    access_token: "fakeaccesstoken",
                    content: "你好我是大留言",
                })
                .expect(200);

            assert.property(res.body, "reply");
            assert.deepProperty(res.body, "reply._id");
            assert.deepPropertyVal(res.body, "reply.content", "你好我是大留言");
            assert.deepPropertyVal(res.body, "reply.floor", 0);
            assert.deepPropertyVal(
                res.body,
                "reply.experience_id",
                experience_id.toString()
            );
            assert.deepPropertyVal(res.body, "reply.like_count", 0);
            assert.deepPropertyVal(res.body, "reply.report_count", 0);
            assert.deepEqual(
                res.body.reply.author_id,
                fake_user._id.toString()
            );
            assert.deepProperty(res.body, "reply.created_at");

            const experience = await db
                .collection("experiences")
                .findOne({ _id: experience_id });
            assert.equal(experience.reply_count, 1);

            const reply = await db
                .collection("replies")
                .findOne({ _id: ObjectId(res.body.reply._id) });

            assert.equal(reply.content, "你好我是大留言");
            assert.equal(reply.floor, 0);
            assert.deepEqual(
                reply.experience_id.toString(),
                experience_id.toString()
            );
            assert.deepPropertyVal(res.body, "reply.like_count", 0);
            assert.deepPropertyVal(res.body, "reply.report_count", 0);
            assert.property(reply, "created_at");
            assert.deepEqual(reply.author_id, fake_user._id);
            assert.deepPropertyVal(res.body, "reply.status", "published");
        });

        it("should 401 Unauthorized if user is not valid", () =>
            request(app)
                .post(path(experience_id))
                .send({
                    access_token: "wrongToken",
                    content: "你好我是大留言",
                })
                .expect(401));

        it("should 404 NotFound if target experience does not exist", () =>
            request(app)
                .post(path("1111"))
                .send({
                    access_token: "fakeaccesstoken",
                    content: "你好我是大留言",
                })
                .expect(404));

        it("should fail, content is required", () =>
            request(app)
                .post(path(experience_id))
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(422));

        afterEach(async () => {
            await db.collection("replies").deleteMany({});
            await db.collection("experiences").deleteMany({});
            await db.collection("popular_experience_logs").drop();
            await create_capped_collection(db);
        });

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe("GET /experiences/:id/replies", () => {
        let experience_id;
        let sandbox = null;
        const TEST_REPLIES_COUNT = 200;

        const path = experience_id_string =>
            `/experiences/${experience_id_string}/replies`;

        before("create user", () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(
                authentication,
                "cachedFacebookAuthentication"
            );
            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeaccesstoken"
                )
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "otherFakeAccessToken"
                )
                .resolves(fake_other_user);
        });

        before("create test data", async () => {
            const result = await db.collection("experiences").insertOne({
                type: "interview",
                author_id: fake_user._id,
            });

            experience_id = result.insertedId;

            const test_replies = [];
            for (let i = 0; i < TEST_REPLIES_COUNT; i += 1) {
                test_replies.push(
                    Object.assign(generateReplyData(), {
                        experience_id,
                        author_id: fake_user._id,
                        floor: i,
                    })
                );
            }
            test_replies.push(
                Object.assign(generateReplyData(), {
                    experience_id,
                    author_id: fake_user._id,
                    status: "hidden",
                })
            );
            const result2 = await db
                .collection("replies")
                .insertMany(test_replies);

            const reply1 = result2.ops[0];
            const reply2 = result2.ops[1];
            const reply3 = result2.ops[2];
            const testLikes = [
                {
                    user_id: reply1.author_id,
                    reply_id: reply1._id,
                    experience_id: reply1.experience_id,
                },
                {
                    user_id: reply2.author_id,
                    reply_id: reply2._id,
                    experience_id: reply2.experience_id,
                },
                {
                    user_id: fake_other_user._id,
                    reply_id: reply3._id,
                    experience_id: reply3.experience_id,
                },
            ];
            await db.collection("reply_likes").insertMany(testLikes);
        });

        it("should get replies, and the fields are correct", async () => {
            const res = await request(app)
                .get(path(experience_id))
                .expect(200);

            assert.property(res.body, "replies");
            assert.isArray(res.body.replies);
            assert.notDeepProperty(res.body, "replies.0.author_id");
            assert.deepProperty(res.body, "replies.0._id");
            assert.deepProperty(res.body, "replies.0.content");
            assert.deepProperty(res.body, "replies.0.like_count");
            assert.deepProperty(res.body, "replies.0.report_count");
            assert.deepProperty(res.body, "replies.0.created_at");
            assert.deepProperty(res.body, "replies.0.floor");
            assert.lengthOf(res.body.replies, 20, "不給 limit 的最大回傳數量");
        });

        it("get experiences replies data and expect 200 replies ", () =>
            request(app)
                .get(path(experience_id))
                .query({
                    limit: 200,
                })
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "replies");
                    assert.notDeepProperty(res.body, "replies.0.author_id");
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, TEST_REPLIES_COUNT);
                }));

        it("get experiences replies data and expect 200 replies (total is 201) ", () =>
            request(app)
                .get(path(experience_id))
                .query({
                    limit: 999,
                })
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "replies");
                    assert.notDeepProperty(res.body, "replies.0.author_id");
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 200);
                }));

        it("should not see liked (true/false) if not autheticated", () =>
            request(app)
                .get(path(experience_id))
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "replies");
                    assert.isArray(res.body.replies);
                    assert.notDeepProperty(res.body, "replies.0.liked");
                    assert.notDeepProperty(res.body, "replies.1.liked");
                }));

        it("should see liked (true/false) if autheticated", async () => {
            const res1 = await request(app)
                .get(path(experience_id))
                .query({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            assert.property(res1.body, "replies");
            assert.isArray(res1.body.replies);
            assert.isTrue(
                res1.body.replies[0].liked,
                "fake_user 對 reply1 按過讚"
            );
            assert.isTrue(
                res1.body.replies[1].liked,
                "fake_user 對 reply2 按過讚"
            );
            assert.isFalse(
                res1.body.replies[2].liked,
                "fake_user 對 reply3 沒表達 like"
            );

            const res2 = await request(app)
                .get(path(experience_id))
                .query({
                    access_token: "otherFakeAccessToken",
                })
                .expect(200);

            assert.property(res2.body, "replies");
            assert.isArray(res2.body.replies);
            assert.isFalse(
                res2.body.replies[0].liked,
                "fake_other_user 對 reply1 沒表達 like"
            );
            assert.isFalse(
                res2.body.replies[1].liked,
                "fake_other_user 對 reply2 沒表達 like"
            );
            assert.isTrue(
                res2.body.replies[2].liked,
                "fake_other_user 對 reply3 按過讚"
            );
        });

        it("get experiences replies data by start 0 and limit 100 , expect 100 replies ", () =>
            request(app)
                .get(path(experience_id))
                .query({
                    limit: 100,
                    start: 0,
                    access_token: "fakeaccesstoken",
                })
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "replies");
                    assert.notDeepProperty(res.body, "author_id");
                    assert.isArray(res.body.replies);
                    assert.lengthOf(res.body.replies, 100);
                }));

        it("set error replies and expect error code 404", () =>
            request(app)
                .get(path("1111"))
                .query({
                    access_token: "fakeaccesstoken",
                })
                .expect(404));

        it("limit = 2000  and expect error code 402", () =>
            request(app)
                .get(path(experience_id))
                .query({
                    access_token: "fakeaccesstoken",
                    limit: 2000,
                })
                .expect(422));

        it("get one experiences replies , and validate return field", async () => {
            const res = await request(app)
                .get(path(experience_id))
                .query({
                    limit: 1,
                    start: 0,
                    access_token: "fakeaccesstoken",
                })
                .expect(200);
            assert.property(res.body, "replies");
            assert.notDeepProperty(res.body.replies[0], "author_id");

            assert.deepProperty(res.body.replies[0], "_id");
            assert.deepProperty(res.body.replies[0], "content");
            assert.deepProperty(res.body.replies[0], "like_count");
            assert.deepProperty(res.body.replies[0], "report_count");
            assert.deepProperty(res.body.replies[0], "liked");
            assert.deepProperty(res.body.replies[0], "created_at");
            assert.deepProperty(res.body.replies[0], "floor");
        });

        after(async () => {
            await db.collection("replies").deleteMany({});
            await db.collection("experiences").deleteMany({});
            await db.collection("reply_likes").deleteMany({});
        });

        after(() => {
            sandbox.restore();
        });
    });
});
