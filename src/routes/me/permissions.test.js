const { assert } = require("chai");
const sinon = require("sinon");
const request = require("supertest");
const { ObjectId } = require("mongodb");

const app = require("../../app");
const { FakeUserFactory } = require("../../utils/test_helper");
const authorization = require("../../libs/authorization");

describe("GET /me/permission/search 確認使用者查詢資訊權限", () => {
    let sandbox;
    const fake_user_factory = new FakeUserFactory();

    before(async () => {
        await fake_user_factory.setUp();
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it("hasSearchPermission is true", async () => {
        const user = { _id: new ObjectId(), facebook_id: "-1" };
        const token = await fake_user_factory.create(user);

        const cachedSearchPermissionAuthorization = sandbox
            .stub(authorization, "cachedSearchPermissionAuthorization")
            .withArgs(sinon.match.object, sinon.match.object, user._id)
            .resolves(true);

        const res = await request(app)
            .get("/me/permissions/search")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        sinon.assert.calledOnce(cachedSearchPermissionAuthorization);
        assert.propertyVal(res.body, "hasSearchPermission", true);
    });

    it("hasSearchPermission is false if facebook auth fail", async () => {
        const res = await request(app)
            .get("/me/permissions/search")
            .expect(200);

        assert.propertyVal(res.body, "hasSearchPermission", false);
    });

    it("hasSearchPermission is false if authorization fail", async () => {
        const token = await fake_user_factory.create({ facebook_id: "-2" });
        sandbox
            .stub(authorization, "cachedSearchPermissionAuthorization")
            .rejects();

        const res = await request(app)
            .get("/me/permissions/search")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        assert.propertyVal(res.body, "hasSearchPermission", false);
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });
});
