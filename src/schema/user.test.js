const { assert } = require("chai");
const { UserInputError } = require("apollo-server-express");
const request = require("supertest");
const sinon = require("sinon");
const app = require("../app");
const { connectMongo } = require("../models/connect");
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require("../routes/experiences/testData");
const { FakeUserFactory } = require("../utils/test_helper");
const resolvers = require("../schema/resolvers");
const facebook = require("../libs/facebook");
const google = require("../libs/google");
const jwt = require("../utils/jwt");

const userExperiencesResolver = resolvers.User.experiences;
const userExperiencesCountResolver = resolvers.User.experience_count;

describe("User 經驗相關", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    const fake_user = {
        facebook_id: "-1",
    };
    const fake_other_user = {
        facebook_id: "-2",
    };
    let work_experience_id;
    let interview_experience_id;

    before(async () => {
        ({ db } = await connectMongo());
        await fake_user_factory.setUp();
    });

    before("Create some users", async () => {
        await fake_user_factory.create(fake_user);
    });

    before("Create data", async () => {
        const user_work_experience = {
            ...generateWorkExperienceData(),
            status: "published",
            author_id: fake_user._id,
        };
        const user_interview_experience = {
            ...generateInterviewExperienceData(),
            status: "hidden",
            author_id: fake_user._id,
        };
        const other_user_interview_experience = {
            ...generateInterviewExperienceData(),
            status: "published",
            author_id: fake_other_user._id,
        };
        const result = await db
            .collection("experiences")
            .insertMany([
                user_work_experience,
                user_interview_experience,
                other_user_interview_experience,
            ]);
        work_experience_id = result.insertedIds[0];
        interview_experience_id = result.insertedIds[1];
    });

    after(async () => {
        await db.collection("experiences").deleteMany({});
        await fake_user_factory.tearDown();
    });

    describe("User@experiences resolver", () => {
        it("Resolve user's experiences", async () => {
            const results = await userExperiencesResolver(
                fake_user,
                { start: 0, limit: 20 },
                { db }
            );
            assert.lengthOf(results, 2);
            assert.sameMembers(results.map(x => x._id.toString()), [
                work_experience_id.toString(),
                interview_experience_id.toString(),
            ]);
        });

        it("Reject, if limit > 100", async () => {
            const resultsP = userExperiencesResolver(
                fake_user,
                { start: 0, limit: 150 },
                { db }
            );
            assert.isRejected(resultsP, UserInputError);
        });

        it("Reject, if start < 0", async () => {
            const resultsP = userExperiencesResolver(
                fake_user,
                { start: -5, limit: 20 },
                { db }
            );
            assert.isRejected(resultsP, UserInputError);
        });
    });

    describe("User@experiences_count resolver", () => {
        it("Resolve user's experiences", async () => {
            const results = await userExperiencesCountResolver(
                fake_user,
                {},
                { db }
            );
            assert.equal(results, 2);
        });
    });
});

describe("Mutation.facebookLogin", () => {
    const fake_user_factory = new FakeUserFactory();
    let sandbox = null;
    const user_email = "goodjob@gmail.com";
    let fake_user = {
        facebook_id: "1",
    };

    before(async () => {
        await fake_user_factory.setUp();
        await fake_user_factory.create(fake_user);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should login via correct accessToken", async () => {
        const accessTokenAuth = sandbox
            .stub(facebook, "accessTokenAuth")
            .withArgs("good_accesstoken")
            .resolves({
                id: "1",
                name: "markLin",
                email: user_email,
            });

        const payload = {
            query: /* GraphQL */ `
                mutation FacebookLogin($input: FacebookLoginInput!) {
                    facebookLogin(input: $input) {
                        token
                        user {
                            _id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    accessToken: "good_accesstoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        // Payload 正確
        assert.deepPropertyVal(
            res.body.data,
            "facebookLogin.user._id",
            fake_user._id.toString()
        );
        assert.deepProperty(res.body.data, "facebookLogin.token");
        sinon.assert.calledOnce(accessTokenAuth);

        // token 可以登入
        const token = res.body.data.facebookLogin.token;
        const decoded = await jwt.verify(token);
        assert.propertyVal(decoded, "user_id", fake_user._id.toString());

        // In DB
        const user = await fake_user_factory.user_model.findOneById(
            fake_user._id
        );
        assert.propertyVal(
            user,
            "name",
            "markLin",
            "登入時會將缺失的 name 補上"
        );
        assert.propertyVal(
            user,
            "email",
            user_email,
            "登入時會將缺失的 email 補上"
        );
    });

    it("should login via correct accessToken and create new user", async () => {
        const accessTokenAuth = sandbox
            .stub(facebook, "accessTokenAuth")
            .withArgs("good_accesstoken")
            .resolves({
                id: "2",
                name: "古嘉伯",
                email: "ci@goodjob.life",
            });

        const payload = {
            query: /* GraphQL */ `
                mutation FacebookLogin($input: FacebookLoginInput!) {
                    facebookLogin(input: $input) {
                        token
                        user {
                            facebook_id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    accessToken: "good_accesstoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        // Payload 正確
        assert.deepPropertyVal(
            res.body.data,
            "facebookLogin.user.facebook_id",
            "2"
        );
        sinon.assert.calledOnce(accessTokenAuth);

        // token 可以登入
        const token = res.body.data.facebookLogin.token;
        await jwt.verify(token);

        // In DB
        const user = await fake_user_factory.user_model.findOneByFacebookId(
            "2"
        );
        assert.propertyVal(user, "name", "古嘉伯");
        assert.propertyVal(user, "email", "ci@goodjob.life");
    });

    it("should fail if accessToken is wrong", async () => {
        const accessTokenAuth = sandbox
            .stub(facebook, "accessTokenAuth")
            .withArgs("fake_accesstoken")
            .rejects();

        const payload = {
            query: /* GraphQL */ `
                mutation FacebookLogin($input: FacebookLoginInput!) {
                    facebookLogin(input: $input) {
                        token
                        user {
                            _id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    accessToken: "fake_accesstoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body, "errors");
        sinon.assert.calledOnce(accessTokenAuth);
    });
});

describe("Mutation.googleLogin", () => {
    const fake_user_factory = new FakeUserFactory();
    let sandbox = null;
    const user_email = "goodjob@gmail.com";
    let fake_user = {
        google_id: "1",
    };

    before(async () => {
        await fake_user_factory.setUp();
        await fake_user_factory.create(fake_user);
    });

    after(async () => {
        await fake_user_factory.tearDown();
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should login via correct idToken", async () => {
        const verifyIdToken = sandbox
            .stub(google, "verifyIdToken")
            .withArgs("good_idtoken")
            .resolves({
                sub: "1",
                name: "markLin",
                email: user_email,
            });

        const payload = {
            query: /* GraphQL */ `
                mutation GoogleLogin($input: GoogleLoginInput!) {
                    googleLogin(input: $input) {
                        token
                        user {
                            _id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    idToken: "good_idtoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        // Payload 正確
        assert.deepPropertyVal(
            res.body.data,
            "googleLogin.user._id",
            fake_user._id.toString()
        );
        assert.deepProperty(res.body.data, "googleLogin.token");
        sinon.assert.calledOnce(verifyIdToken);

        // token 可以登入
        const token = res.body.data.googleLogin.token;
        const decoded = await jwt.verify(token);
        assert.propertyVal(decoded, "user_id", fake_user._id.toString());

        // In DB
        const user = await fake_user_factory.user_model.findOneById(
            fake_user._id
        );
        assert.propertyVal(
            user,
            "name",
            "markLin",
            "登入時會將缺失的 name 補上"
        );
        assert.propertyVal(
            user,
            "email",
            user_email,
            "登入時會將缺失的 email 補上"
        );
    });

    it("should login via correct idToken and create new user", async () => {
        const verifyIdToken = sandbox
            .stub(google, "verifyIdToken")
            .withArgs("good_idtoken")
            .resolves({
                sub: "2",
                name: "古嘉伯",
                email: "ci@goodjob.life",
            });

        const payload = {
            query: /* GraphQL */ `
                mutation GoogleLogin($input: GoogleLoginInput!) {
                    googleLogin(input: $input) {
                        token
                        user {
                            google_id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    idToken: "good_idtoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        // Payload 正確
        assert.deepPropertyVal(
            res.body.data,
            "googleLogin.user.google_id",
            "2"
        );
        sinon.assert.calledOnce(verifyIdToken);

        // token 可以登入
        const token = res.body.data.googleLogin.token;
        await jwt.verify(token);

        // In DB
        const user = await fake_user_factory.user_model.findOneByGoogleId("2");
        assert.propertyVal(user, "name", "古嘉伯");
        assert.propertyVal(user, "email", "ci@goodjob.life");
    });

    it("should fail if accessToken is wrong", async () => {
        const verifyIdToken = sandbox
            .stub(google, "verifyIdToken")
            .withArgs("fake_idtoken")
            .rejects();

        const payload = {
            query: /* GraphQL */ `
                mutation GoogleLogin($input: GoogleLoginInput!) {
                    googleLogin(input: $input) {
                        token
                        user {
                            _id
                        }
                    }
                }
            `,
            variables: {
                input: {
                    idToken: "fake_idtoken",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body, "errors");
        sinon.assert.calledOnce(verifyIdToken);
    });
});
