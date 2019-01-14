const { assert } = require("chai");
const sinon = require("sinon");
const request = require("supertest");

const app = require("../../app");
const authentication = require("../../libs/authentication");
const recommendation = require("../../libs/recommendation");

describe("POST /me/recommendations 取得使用者推薦字串", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it("get recommendation string success", async () => {
        const cachedFacebookAuthentication = sandbox
            .stub(authentication, "cachedFacebookAuthentication")
            .withArgs(sinon.match.object, sinon.match.object, "fakeaccesstoken")
            .resolves({ facebook_id: "-1" });

        const getRecommendationString = sandbox
            .stub(recommendation, "getRecommendationString")
            .withArgs(sinon.match.object, { id: "-1", type: "facebook" })
            .resolves("00000000ccd8958909a983e9");

        const res = await request(app)
            .post("/me/recommendations")
            .send({
                access_token: "fakeaccesstoken",
            })
            .expect(200);

        sinon.assert.calledOnce(cachedFacebookAuthentication);
        sinon.assert.calledOnce(getRecommendationString);

        assert.propertyVal(
            res.body,
            "recommendation_string",
            "00000000ccd8958909a983e9"
        );
    });

    it("fail if facebook auth fail", async () => {
        sandbox.stub(authentication, "cachedFacebookAuthentication").rejects();

        await request(app)
            .post("/me/recommendations")
            .expect(401);
    });

    it("fail if getRecommendationString fail", async () => {
        sandbox
            .stub(authentication, "cachedFacebookAuthentication")
            .resolves({ _id: { id: "-1", type: "facebook" } });
        sandbox.stub(recommendation, "getRecommendationString").rejects();

        await request(app)
            .post("/me/recommendations")
            .send({
                access_token: "fakeaccesstoken",
            })
            .expect(500);
    });

    afterEach(() => {
        sandbox.restore();
    });
});
