const assert = require("chai").assert;

const mongo = require("mongodb");
const request = require("supertest");
const app = require("../../app");
const { MongoClient, ObjectId } = require("mongodb");
const sinon = require("sinon");
const config = require("config");

const authentication = require("../../libs/authentication");
const { generateInterviewExperienceData } = require("./testData");

describe("Experience Likes Test", () => {
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
            name: "markLin002",
        },
    };

    before(async () => {
        db = await MongoClient.connect(config.get("MONGODB_URI"));
    });

    describe("Post : /experiences/:id/likes", () => {
        let experience_id;
        let sandbox;

        beforeEach("Create test data", async () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox
                .stub(authentication, "cachedFacebookAuthentication")
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
                    "other_fakeaccesstoken"
                )
                .resolves(fake_other_user);

            const result = await db.collection("experiences").insertOne({
                type: "interview",
                author_id: new ObjectId(),
                status: "published",
                like_count: 0,
            });
            experience_id = result.insertedId.toString();
        });

        it("Post likes, and expected return success ", () =>
            request(app)
                .post(`/experiences/${experience_id}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200)
                .expect(res => {
                    assert.deepPropertyVal(res.body, "success", true);
                }));

        it("Set error experience Id, and expected return 404", () =>
            request(app)
                .post("/experiences/1111/likes")
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(404));

        it("(! Need Index), Post like 2 times , and expected return 403", async () => {
            await request(app)
                .post(`/experiences/${experience_id}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                });
            await request(app)
                .post(`/experiences/${experience_id}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(403);
        });

        it("User does not login , and expected return code 401", () =>
            request(app)
                .post(`/experiences/${experience_id}/likes`)
                .expect(401));

        it("Post like and get experience , and expected like_count of experience should be 1 ", async () => {
            await request(app)
                .post(`/experiences/${experience_id}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                });
            const result = await db
                .collection("experiences")
                .find({
                    _id: new mongo.ObjectId(experience_id),
                })
                .toArray();

            assert.equal(result[0].like_count, 1);
        });

        it("(! Need Index), Post like 2 times (same user) and get experience , and like_count of experience should be 1 ", async () => {
            const uri = `/experiences/${experience_id}/likes`;
            await request(app)
                .post(uri)
                .send({
                    access_token: "fakeaccesstoken",
                });
            await request(app)
                .post(uri)
                .send({
                    access_token: "fakeaccesstoken",
                });
            const result = await db
                .collection("experiences")
                .find({
                    _id: new mongo.ObjectId(experience_id),
                })
                .toArray();

            assert.equal(result[0].like_count, 1);
        });

        it("Post like 2 times(different user) and get experience , and expected like_count of experience should be 2 ", async () => {
            const uri = `/experiences/${experience_id}/likes`;
            await request(app)
                .post(uri)
                .send({
                    access_token: "fakeaccesstoken",
                });
            await request(app)
                .post(uri)
                .send({
                    access_token: "other_fakeaccesstoken",
                });
            const result = await db
                .collection("experiences")
                .find({
                    _id: new mongo.ObjectId(experience_id),
                })
                .toArray();

            assert.equal(result[0].like_count, 2);
        });

        it("Test experience_likes index  , expected the index is exist ", async () => {
            const indexes = await db.collection("experience_likes").indexes();
            const uniqueIndex = indexes[1];
            assert.isDefined(uniqueIndex);
            assert.equal(uniqueIndex.name, "user_id_1_experience_id_1");
            assert.equal(uniqueIndex.unique, true);
        });

        afterEach(() => {
            sandbox.restore();
            const pro1 = db.collection("experience_likes").deleteMany();
            const pro2 = db.collection("experiences").deleteMany({});
            return Promise.all([pro1, pro2]);
        });
    });

    describe("Delete : /experiences/:id/likes", () => {
        let experience_id_string_by_user = null;
        let experience_id_by_user = null;
        let experience_id_by_other_user = null;
        let test_likes = null;
        let sandbox;

        beforeEach("mock user", () => {
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

        beforeEach("create test data", async () => {
            const experience_by_user = Object.assign(
                generateInterviewExperienceData(),
                {
                    author_id: fake_user._id,
                    like_count: 2,
                }
            );

            const experience_by_other_user = Object.assign(
                generateInterviewExperienceData(),
                {
                    author_id: fake_other_user._id,
                }
            );

            const result = await db
                .collection("experiences")
                .insertMany([experience_by_user, experience_by_other_user]);

            experience_id_by_user = result.ops[0]._id;
            experience_id_string_by_user = result.ops[0]._id.toString();
            experience_id_by_other_user = result.ops[1]._id;

            const likes = await db.collection("experience_likes").insertMany([
                {
                    created_at: new Date(),
                    user_id: fake_user._id,
                    experience_id: experience_id_by_user,
                },
                {
                    created_at: new Date(),
                    user_id: fake_other_user._id,
                    experience_id: experience_id_by_user,
                },
                {
                    created_at: new Date(),
                    user_id: fake_user._id,
                    experience_id: experience_id_by_other_user,
                },
            ]);
            test_likes = likes.ops;
        });

        it("should delete the record, and return success", async () => {
            await request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            const result = await db.collection("experience_likes").findOne({
                experience_id: experience_id_by_user,
                user_id: fake_user._id,
            });
            assert.equal(result, null, "No record in experience_likes");

            const experience = await db.collection("experiences").findOne({
                _id: experience_id_by_user,
            });
            assert.equal(
                experience.like_count,
                1,
                "the like_count should be 1 instead of 2"
            );
        });

        it("cannot delete like, beacause the user does not login and return 404", async () => {
            await db.collection("experience_likes").deleteMany({
                user_id: test_likes[0].user_id,
            });
            await request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .expect(401);

            const experience = await db.collection("experiences").findOne({
                _id: experience_id_by_user,
            });
            assert.equal(
                experience.like_count,
                2,
                "the like_count should be 2 (it can not change)"
            );
        });

        it("cannot delete like, beacause the like does not exist and return 404", async () => {
            await db.collection("experience_likes").deleteMany({
                user_id: test_likes[0].user_id,
            });
            await request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(404);
            const experience = await db.collection("experiences").findOne({
                _id: experience_id_by_user,
            });
            assert.equal(
                experience.like_count,
                2,
                "the like_count should be 2 (it can not change)"
            );
        });

        it("cannot delete like, because experience does not exist and return 404", async () => {
            await db.collection("experience_likes").remove({
                user_id: test_likes[0].user_id,
            });
            await request(app)
                .delete("/experiences/123456789/likes")
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(404);
            const experience = await db.collection("experiences").findOne({
                _id: experience_id_by_user,
            });
            assert.equal(
                experience.like_count,
                2,
                "the like_count should be 2 (it can not change)"
            );
        });

        it("should not delete others`s like if user cancels the like of an experience", async () => {
            await request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            const result = await db.collection("experience_likes").findOne({
                experience_id: experience_id_by_user,
                user_id: fake_other_user._id,
            });
            assert.equal(
                result.user_id.toString(),
                fake_other_user._id.toString(),
                "the other user of like should exist"
            );
        });

        it("should not delete the other experiences`s like, when the user cancels the like of an experience", async () => {
            await request(app)
                .delete(`/experiences/${experience_id_string_by_user}/likes`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            const result = await db.collection("experience_likes").findOne({
                experience_id: experience_id_by_other_user,
                user_id: fake_user._id,
            });
            assert.equal(
                result.user_id.toString(),
                fake_user._id.toString(),
                "the other experience`s like should exist"
            );
        });

        afterEach(() => {
            sandbox.restore();
            const pro1 = db.collection("experience_likes").deleteMany();
            const pro2 = db.collection("experiences").deleteMany({});
            return Promise.all([pro1, pro2]);
        });
    });
});
