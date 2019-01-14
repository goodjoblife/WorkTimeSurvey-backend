const { assert } = require("chai");
const request = require("supertest");
const app = require("../app");
const { FakeUserFactory } = require("../utils/test_helper");

describe("Query me", () => {
    const fake_user_factory = new FakeUserFactory();
    const payload = {
        query: `{
            me {
                _id
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
        const token = await fake_user_factory.create({ facebook_id: "-1" });

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
