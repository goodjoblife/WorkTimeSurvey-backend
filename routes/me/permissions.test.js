const { assert } = require("chai");
const sinon = require("sinon");
const request = require("supertest");

const app = require("../../app");
const authentication = require("../../libs/authentication");
const authorization = require("../../libs/authorization");

describe("GET /me/permission/search 確認使用者查詢資訊權限", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it("hasSearchPermission is true", async () => {
        const cachedFacebookAuthentication = sandbox
            .stub(authentication, "cachedFacebookAuthentication")
            .withArgs(sinon.match.object, sinon.match.object, "fakeaccesstoken")
            .resolves({ facebook_id: "-1" });

        const cachedSearchPermissionAuthorization = sandbox
            .stub(authorization, "cachedSearchPermissionAuthorization")
            .withArgs(sinon.match.object, sinon.match.object, {
                id: "-1",
                type: "facebook",
            })
            .resolves(true);

        const res = await request(app)
            .get("/me/permissions/search")
            .query({
                access_token: "fakeaccesstoken",
            })
            .expect(200);

        sinon.assert.calledOnce(cachedFacebookAuthentication);
        sinon.assert.calledOnce(cachedSearchPermissionAuthorization);
        assert.propertyVal(res.body, "hasSearchPermission", true);
    });

    it("hasSearchPermission is false if facebook auth fail", async () => {
        sandbox.stub(authentication, "cachedFacebookAuthentication").rejects();

        const res = await request(app)
            .get("/me/permissions/search")
            .query({
                access_token: "fakeaccesstoken",
            })
            .expect(200);

        assert.propertyVal(res.body, "hasSearchPermission", false);
    });

    it("hasSearchPermission is false if authorization fail", async () => {
        const cachedFacebookAuthentication = sandbox
            .stub(authentication, "cachedFacebookAuthentication")
            .withArgs(sinon.match.object, sinon.match.object, "fakeaccesstoken")
            .resolves({ facebook_id: "-1" });
        sandbox
            .stub(authorization, "cachedSearchPermissionAuthorization")
            .rejects();

        const res = await request(app)
            .get("/me/permissions/search")
            .query({
                access_token: "fakeaccesstoken",
            })
            .expect(200);

        sinon.assert.calledOnce(cachedFacebookAuthentication);
        assert.propertyVal(res.body, "hasSearchPermission", false);
    });

    afterEach(() => {
        sandbox.restore();
    });
});
