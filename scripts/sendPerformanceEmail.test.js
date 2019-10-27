const sinon = require("sinon");
const { assert } = require("chai");
const { ObjectId } = require("mongodb");

const { connectMongo } = require("../src/models/connect");
const sendPerformanceEmail = require("./sendPerformanceEmail");
const emailLib = require("../src/libs/email");

describe("sendPerformanceEmail", () => {
    let db;
    let sandbox;
    const experienceId = "59074fbed17b7412779d1eed";
    const userId = "59074fbed17b7412779d1eee";
    let sendEmailsFromTemplate;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        sandbox = sinon.sandbox.create();

        await db.collection("experiences").insertMany([
            {
                _id: ObjectId(experienceId),
                type: "interview",
                author_id: ObjectId(userId),
                company: {
                    name: "goodjob company",
                },
                archive: {
                    is_archived: false,
                    reason: "",
                },
                status: "published",
                title: "interview share",
                sections: [
                    {
                        id: 0,
                        subtitle: "面試過程",
                        placeholder: "",
                        titlePlaceholder: "段落標題，例：面試方式",
                        content: "something just happens",
                        isSubtitleEditable: false,
                    },
                ],
                view_count: 555,
            },
        ]);

        await db.collection("users").insertOne({
            _id: ObjectId(userId),
            name: "little people",
            email: "test@goodjob.com",
            subscribeEmail: true,
        });

        sendEmailsFromTemplate = sandbox.stub(
            emailLib,
            "sendEmailsFromTemplate"
        );
    });

    it("sendEmailsFromTemplate should be called and only called once", async () => {
        const subject = {
            username: "little people",
            experience: {
                title: "interview share",
                viewCount: 555,
                url: `https://www.goodjob.life/experiences/${experienceId}`,
                typeName: "面試經驗",
                content: "something just happens",
            },
        };

        await sendPerformanceEmail();

        const logs = await db
            .collection("email_logs")
            .find()
            .toArray();

        assert.equal(logs.length, 1);
        assert.isTrue(logs[0].user_id.equals(userId));
        assert.isTrue(logs[0].reason.experience_id.equals(experienceId));
        assert.propertyVal(logs[0].reason, "threshold", 500);

        sinon.assert.calledOnce(sendEmailsFromTemplate);
        sinon.assert.calledWithExactly(
            sendEmailsFromTemplate,
            ["test@goodjob.com"],
            sinon.match.object,
            subject
        );
    });

    it("sendEmailsFromTemplate should not be called if last email is within two weeks", async () => {
        await db.collection("email_logs").insertOne({
            user_id: ObjectId(userId),
            created_at: new Date(),
            reason: {
                experience_id: ObjectId(experienceId),
                threshold: 77,
            },
        });

        await sendPerformanceEmail();

        sinon.assert.notCalled(sendEmailsFromTemplate);
    });

    it("sendEmailsFromTemplate should be called if last email is two weeks ago and exceed new threshold", async () => {
        const threeWeeks = 1000 * 60 * 60 * 24 * 25;
        await db.collection("email_logs").insertOne({
            user_id: ObjectId(userId),
            created_at: new Date(new Date() - threeWeeks),
            reason: {
                experience_id: ObjectId(experienceId),
                threshold: 100,
            },
        });

        const subject = {
            username: "little people",
            experience: {
                title: "interview share",
                viewCount: 555,
                url: `https://www.goodjob.life/experiences/${experienceId}`,
                typeName: "面試經驗",
                content: "something just happens",
            },
        };

        await sendPerformanceEmail();

        sinon.assert.calledOnce(sendEmailsFromTemplate);
        sinon.assert.calledWithExactly(
            sendEmailsFromTemplate,
            ["test@goodjob.com"],
            sinon.match.object,
            subject
        );
    });

    it("sendEmailsFromTemplate should not be called if last email is two weeks ago but does not exceed new threshold", async () => {
        const threeWeeks = 1000 * 60 * 60 * 24 * 25;
        await db.collection("email_logs").insertOne({
            user_id: ObjectId(userId),
            created_at: new Date(new Date() - threeWeeks),
            reason: {
                experience_id: ObjectId(experienceId),
                threshold: 1000,
            },
        });

        await sendPerformanceEmail();

        sinon.assert.notCalled(sendEmailsFromTemplate);
    });

    afterEach(async () => {
        sandbox.restore();

        await db.collection("experiences").deleteMany({});
        await db.collection("users").deleteMany({});
        await db.collection("email_logs").deleteMany({});
    });
});
