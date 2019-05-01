const { assert } = require("chai");
const request = require("supertest");
const sinon = require("sinon");
const app = require("../app");
const emailLib = require("../libs/email");
const { FakeUserFactory } = require("../utils/test_helper");
const { issueToken } = require("../utils/verify_email_token");
const { VERIFIED, SENT_VERIFICATION_LINK } = require("../models/user_model");

describe("Verify email", () => {
    const fake_user_factory = new FakeUserFactory();
    let sandbox = null;
    let fake_user = {
        name: "mark",
        facebook_id: "-1",
    };
    let fake_user_token;

    before(async () => {
        await fake_user_factory.setUp();
        fake_user_token = await fake_user_factory.create(fake_user);
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

    it("Mutation.sendVerifyEmail", async () => {
        const sendEmailsFromTemplate = sandbox
            .stub(emailLib, "sendEmailsFromTemplate")
            .resolves();

        const payload = {
            query: `
                mutation SendVerifyEmail($input: SendVerifyEmailInput!) {
                    sendVerifyEmail(input: $input) {
                        status
                    }
                }
            `,
            variables: {
                input: {
                    email: "ci@goodjob.life",
                    redirect_url: "/",
                },
            },
        };

        await request(app)
            .post("/graphql")
            .send(payload)
            .set("Authorization", `Bearer ${fake_user_token}`)
            .expect(200);

        // 檢查 sendEmailsFromTemplate 收到對的 email 位址
        sinon.assert.calledWithExactly(
            sendEmailsFromTemplate,
            ["ci@goodjob.life"],
            sinon.match.object,
            sinon.match.object
        );

        // 檢查 DB 內的欄位
        const user = await fake_user_factory.user_model.findOneById(
            fake_user._id
        );
        assert.propertyVal(user, "email_status", SENT_VERIFICATION_LINK);
        assert.notProperty(user, "email");
    });

    it("Mutation.verifyEmail", async () => {
        const token = await issueToken({
            user_id: fake_user._id,
            email: "ci@goodjob.life",
            redirect_url: "/",
        });
        const payload = {
            query: `
                mutation VerifyEmail($input: VerifyEmailInput!) {
                    verifyEmail(input: $input) {
                        token,
                        redirect_url
                    }
                }
            `,
            variables: {
                input: {
                    token,
                },
            },
        };

        await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        // 檢查 DB 內的欄位
        const user = await fake_user_factory.user_model.findOneById(
            fake_user._id
        );
        assert.propertyVal(user, "email_status", VERIFIED);
        assert.propertyVal(user, "email", "ci@goodjob.life");
    });

    it("Mutation.verifyEmail (wrong token)", async () => {
        const payload = {
            query: `
                mutation VerifyEmail($input: VerifyEmailInput!) {
                    verifyEmail(input: $input) {
                        token,
                        redirect_url
                    }
                }
            `,
            variables: {
                input: {
                    token: "wrong token",
                },
            },
        };

        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body, "errors");
    });
});
