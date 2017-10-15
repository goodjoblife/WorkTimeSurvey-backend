const chai = require("chai");
chai.use(require("chai-datetime"));
const request = require("supertest");
const app = require("../../app");
const { MongoClient, ObjectId } = require("mongodb");
const config = require("config");
const sinon = require("sinon");
const authentication = require("../../libs/authentication");

const { assert } = chai;

describe("Replies 留言", () => {
    let db;

    before("DB: Setup", async () => {
        db = await MongoClient.connect(config.get("MONGODB_URI"));
    });

    describe("PATCH /replies/:id", () => {
        let sandbox;
        let reply_id_string;

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
                name: "lin",
            },
        };

        beforeEach("mock user authentication", () => {
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
                    "fakeOtherAccessToken"
                )
                .resolves(fake_other_user);
        });

        beforeEach("Seed reply", async () => {
            const reply = {
                experience_id: new ObjectId(),
                content: "Hello",
                author_id: fake_user._id,
                floor: 2,
                like_count: 0,
                status: "published",
            };

            const result = await db.collection("replies").insertOne(reply);
            reply_id_string = result.insertedId.toString();
        });

        it("should return 200, when autheticated user updates status", async () => {
            const res = await request(app)
                .patch(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "hidden",
                })
                .expect(200);

            assert.isTrue(res.body.success);
            assert.propertyVal(res.body, "status", "hidden");

            const reply = await db
                .collection("replies")
                .findOne({ _id: new ObjectId(reply_id_string) });
            assert.propertyVal(reply, "status", "hidden");
        });

        it("should return 404, when reply does not exist", () =>
            request(app)
                .patch(`/replies/a_fake_reply_id`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "hidden",
                })
                .expect(404));

        it("should return 401, when user is not authenticated", () =>
            request(app)
                .patch(`/replies/${reply_id_string}`)
                .send({
                    status: "hidden",
                })
                .expect(401));

        it("should return 403, when user is not authorized to modify someone's reply", () =>
            request(app)
                .patch(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeOtherAccessToken",
                    status: "hidden",
                })
                .expect(403));

        it("should return 422, when `status` is not valid", () =>
            request(app)
                .patch(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "xxxxxx",
                })
                .expect(422));

        it("should return 422, when `status` is not given", () =>
            request(app)
                .patch(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(422));

        afterEach(() => db.collection("replies").deleteMany({}));

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe.only("PUT /replies/:id", () => {
        let sandbox;
        let reply_id_string;

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
                name: "lin",
            },
        };

        beforeEach("mock user authentication", () => {
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
                    "fakeOtherAccessToken"
                )
                .resolves(fake_other_user);
        });

        beforeEach("Seed reply", async () => {
            const reply = {
                experience_id: new ObjectId(),
                content: "Hello",
                author_id: fake_user._id,
                floor: 2,
                like_count: 0,
                status: "published",
            };

            const result = await db.collection("replies").insertOne(reply);
            reply_id_string = result.insertedId.toString();
        });

        it("should return 200, when autheticated user updates reply", async () => {
            const new_content = "哥是改過的留言";
            const res = await request(app)
                .put(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    content: new_content,
                })
                .expect(200);

            assert.isTrue(res.body.success);

            const reply = await db
                .collection("replies")
                .findOne({ _id: new ObjectId(reply_id_string) });
            assert.propertyVal(reply, "content", new_content);

            const reply_history = await db
                .collection("replies_history")
                .findOne({
                    ref_id: new ObjectId(reply_id_string),
                });
            assert.deepProperty(reply_history, "time_stamp");
            assert.deepProperty(reply_history, "ref_id");
        });

        it("should return 404, when reply does not exist", () =>
            request(app)
                .put(`/replies/a_fake_reply_id`)
                .send({
                    access_token: "fakeaccesstoken",
                    content: "哥是改過的留言",
                })
                .expect(404));

        it("should return 401, when user is not authenticated", () =>
            request(app)
                .put(`/replies/${reply_id_string}`)
                .send({
                    status: "hidden",
                })
                .expect(401));

        it("should return 403, when user is not authorized to update someone's reply", () =>
            request(app)
                .put(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeOtherAccessToken",
                    content: "哥是改過的留言",
                })
                .expect(403));

        it("should return 422, when `content` is not given", () =>
            request(app)
                .put(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(422));

        it("should return 422, when `content` length more than 1000", () =>
            request(app)
                .put(`/replies/${reply_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(422));

        afterEach(() => db.collection("replies").deleteMany({}));

        afterEach(() => {
            sandbox.restore();
        });
    });
});
