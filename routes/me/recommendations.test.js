const { assert } = require("chai");
const sinon = require("sinon");
const request = require("supertest");

const app = require("../../app");
const { FakeUserFactory } = require("../../utils/test_helper");
const recommendation = require("../../libs/recommendation");

describe("POST /me/recommendations 取得使用者推薦字串", () => {
    let sandbox;
    const fake_user_factory = new FakeUserFactory();

    before(async () => {
        await fake_user_factory.setUp();
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    it("get recommendation string success", async () => {
        const token = await fake_user_factory.create({ facebook_id: "-1" });

        const getRecommendationString = sandbox
            .stub(recommendation, "getRecommendationString")
            .withArgs(sinon.match.object, { id: "-1", type: "facebook" })
            .resolves("00000000ccd8958909a983e9");

        const res = await request(app)
            .post("/me/recommendations")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        sinon.assert.calledOnce(getRecommendationString);

        assert.propertyVal(
            res.body,
            "recommendation_string",
            "00000000ccd8958909a983e9"
        );
    });

    it("fail if facebook auth fail", async () => {
        await request(app)
            .post("/me/recommendations")
            .expect(401);
    });

    it("fail if getRecommendationString fail", async () => {
        const token = await fake_user_factory.create({ facebook_id: "-2" });
        sandbox.stub(recommendation, "getRecommendationString").rejects();

        await request(app)
            .post("/me/recommendations")
            .set("Authorization", `Bearer ${token}`)
            .expect(500);
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });
});
