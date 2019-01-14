const { assert } = require("chai");
const request = require("supertest");
const app = require("../../app");
const { FakeUserFactory } = require("../../utils/test_helper");

describe("GET /me", () => {
    let fake_user_factory;

    before(async () => {
        fake_user_factory = new FakeUserFactory();
        await fake_user_factory.setUp();
    });

    it("get my information", async () => {
        const token = await fake_user_factory.create({ facebook_id: "-1" });

        const res = await request(app)
            .get("/me")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        assert.property(res.body, "user");
    });

    it("fail if not login", async () => {
        await request(app)
            .get("/me")
            .expect(401);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });
});
