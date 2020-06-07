const { assert } = require("chai");
const request = require("supertest");
const { ObjectId } = require("mongodb");
const app = require("../app");
const { connectMongo } = require("../models/connect");
const { FakeUserFactory } = require("../utils/test_helper");

describe("Query me", () => {
    const fake_user_factory = new FakeUserFactory();
    const payload = {
        query: `{
            me {
                _id
                name
            }
        }`,
        variables: null,
    };

    before(async () => {
        await fake_user_factory.setUp();
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    it("get my information", async () => {
        const token = await fake_user_factory.create({
            name: "mark",
            facebook_id: "-1",
        });

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        assert.property(res.body.data, "me");
    });

    it("fail if not login", async () => {
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.propertyVal(res.body, "data", null);
        assert.property(res.body, "errors");
    });
});

describe("Mutation unlockExperience", () => {
    const fake_user_factory = new FakeUserFactory();
    let db;
    let userId;
    let token;
    let experienceId;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        userId = ObjectId();
        await fake_user_factory.setUp();
        token = await fake_user_factory.create({
            _id: userId,
            name: "mark",
            facebook_id: "facebook_id",
            points: 100,
            unlocked_experiences: [],
        });

        const result = await db.collection("experiences").insertOne({
            created_at: new Date(),
            type: "work",
            title: "ugly",
            sections: [
                {
                    subtitle: "段落標題",
                    content: "我很醜",
                },
            ],
            status: "published",
            archive: {
                is_archived: false,
            },
        });
        experienceId = result.insertedId;
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    it("successfully unlock experience", async () => {
        const payload = {
            query: /* GraphQL */ `
                mutation UnlockExperience($input: ID!) {
                    unlockExperience(input: $input) {
                        id
                    }
                }
            `,
            variables: {
                input: experienceId,
            },
        };

        // API 200
        await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        // 檢查 user.unlocked_experiences & user.points
        const me = await db.collection("users").findOne({ _id: userId });
        assert.lengthOf(me.unlocked_experiences, 1);
        assert.equal(`${me.unlocked_experiences[0]._id}`, `${experienceId}`);

        // 檢查 userPointEvent
        const userPointEvents = await db
            .collection("user_point_events")
            .find({ user_id: userId })
            .toArray();
        assert.lengthOf(userPointEvents, 1);
        assert.equal(
            `${userPointEvents[0].snapshot.experienceId}`,
            `${experienceId}`
        );
    });

    it("cannot unlock same experience twice", async () => {
        const payload = {
            query: /* GraphQL */ `
                mutation UnlockExperience($input: ID!) {
                    unlockExperience(input: $input) {
                        id
                    }
                }
            `,
            variables: {
                input: experienceId,
            },
        };

        // API 200
        await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        // call payload twice, second time will be error
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        assert.lengthOf(res.body.errors, 1);
    });

    it("cannot unlock experience that not exists", async () => {
        // prepare payload
        const payload = {
            query: /* GraphQL */ `
                mutation UnlockExperience($input: ID!) {
                    unlockExperience(input: $input) {
                        id
                    }
                }
            `,
            variables: {
                input: `${ObjectId()}`,
            },
        };
        // call api with arbitrary id
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);
        assert.lengthOf(res.body.errors, 1);
    });
});
