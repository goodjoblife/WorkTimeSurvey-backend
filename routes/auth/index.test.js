const { assert } = require("chai");
const request = require("supertest");
const sinon = require("sinon");
const app = require("../../app");
const { connectMongo } = require("../../models/connect");
const ModelManager = require("../../models/manager");
const facebook = require("../../libs/facebook");
const jwt = require("../../utils/jwt");

describe("Auth", () => {
    let db;
    let user_model;
    let sandbox = null;

    before(async () => {
        ({ db } = await connectMongo());
        const manager = new ModelManager(db);
        user_model = manager.UserModel;
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    describe("POST /auth/facebook", () => {
        const path = "/auth/facebook";
        const userEmail = "goodjob@gmail.com";
        let fake_user = null;

        before(async () => {
            fake_user = await user_model.create({
                facebook_id: "-1",
                facebook: {
                    id: "-1",
                    name: "markLin",
                },
            });
        });

        it("should authenticated via correct access_token", async () => {
            const accessTokenAuth = sandbox
                .stub(facebook, "accessTokenAuth")
                .withArgs("good_accesstoken")
                .resolves({
                    id: "-1",
                    name: "markLin",
                    email: userEmail,
                });

            const res = await request(app)
                .post(path)
                .send({ access_token: "good_accesstoken" })
                .expect(200);

            assert.deepPropertyVal(
                res.body,
                "user._id",
                fake_user._id.toString()
            );
            assert.deepPropertyVal(res.body, "user.facebook_id", "-1");
            assert.deepPropertyVal(res.body, "user.email", userEmail);
            assert.property(res.body, "token");
            sinon.assert.calledOnce(accessTokenAuth);

            const token = res.body.token;
            const decoded = await jwt.verify(token);

            assert.propertyVal(decoded, "user_id", fake_user._id.toString());

            const user = await user_model.findOneById(fake_user._id);
            assert.propertyVal(
                user,
                "name",
                "markLin",
                "登入時會將缺失的 name 補上"
            );
            assert.propertyVal(
                user,
                "email",
                userEmail,
                "登入時會將缺失的 email 補上"
            );
        });

        it("should 401 if access_token is wrong", async () => {
            const accessTokenAuth = sandbox
                .stub(facebook, "accessTokenAuth")
                .withArgs("fake_accesstoken")
                .rejects();

            await request(app)
                .post(path)
                .send({ access_token: "fake_accesstoken" })
                .expect(401);

            sinon.assert.calledOnce(accessTokenAuth);
        });

        after(async () => {
            await user_model.collection.deleteMany({});
        });
    });

    afterEach(() => {
        sandbox.restore();
    });
});
