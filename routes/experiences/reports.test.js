const assert = require("chai").assert;
const request = require("supertest");
const app = require("../../app");
const { ObjectId, DBRef } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const { FakeUserFactory } = require("../../utils/test_helper");

function generatePayload() {
    return {
        reason_category: "我認為這篇文章內容不實",
        reason: "This is not true",
    };
}

describe("Reports Test", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("POST /experiences/:id/reports", () => {
        let experience_id_str;
        const fake_user = {
            _id: new ObjectId(),
            facebook_id: "-1",
            facebook: {
                id: "-1",
                name: "markLin",
            },
        };
        const fake_other_user = {
            _id: new ObjectId(),
            facebook_id: "-2",
            facebook: {
                id: "-2",
                name: "markChen",
            },
        };
        let fake_user_token;
        let fake_other_user_token;

        beforeEach(async () => {
            await fake_user_factory.setUp();
        });

        beforeEach("Create some users", async () => {
            fake_user_token = await fake_user_factory.create(fake_user);
            fake_other_user_token = await fake_user_factory.create(
                fake_other_user
            );
        });

        beforeEach("Create test data", async () => {
            const result = await db.collection("experiences").insertOne({
                type: "interview",
                author_id: new ObjectId(),
                status: "published",
                like_count: 0,
                report_count: 0,
            });

            experience_id_str = result.insertedId.toString();
        });

        it("should return 200 and correct fields if succeed", async () => {
            const res = await request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);

            assert.property(res.body, "report");
            assert.deepProperty(res.body, "report._id");
            assert.deepPropertyVal(
                res.body,
                "report.reason_category",
                "我認為這篇文章內容不實"
            );
            assert.deepPropertyVal(
                res.body,
                "report.reason",
                "This is not true"
            );
            assert.deepProperty(res.body, "report.created_at");
            assert.notDeepProperty(res.body, "report.user");

            const experience = await db
                .collection("experiences")
                .findOne({ _id: ObjectId(experience_id_str) });
            assert.equal(experience.report_count, 1);

            const report = await db.collection("reports").findOne({
                ref: DBRef("experiences", ObjectId(experience_id_str)),
            });

            assert.isNotNull(report);
            assert.equal(report.reason_category, "我認為這篇文章內容不實");
            assert.equal(report.reason, "This is not true");
            assert.property(report, "created_at");
            assert.deepEqual(report.user_id, fake_user._id);
        });

        it("should fail, because reason_category is required", () =>
            request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it('should return 200 and correct fields, while reason_category is "這是廣告或垃圾訊息" and reason is undefined', () =>
            request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send({
                    reason_category: "這是廣告或垃圾訊息",
                })
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "report");
                    assert.deepProperty(res.body, "report._id");
                    assert.deepPropertyVal(
                        res.body,
                        "report.reason_category",
                        "這是廣告或垃圾訊息"
                    );
                    assert.notDeepProperty(res.body, "report.reason");
                    assert.deepProperty(res.body, "report.created_at");
                    assert.notDeepProperty(res.body, "report.user");
                }));

        it('should fail while reason_category is not "這是廣告或垃圾訊息" and reason is undefiend', () =>
            request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send({
                    reason_category: "我認為這篇文章內容不實",
                })
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("should return 404, if experience does not exist", () =>
            request(app)
                .post("/experiences/1111/reports")
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(404));

        it("(! Need Index) should return 403, if post report 2 times", async () => {
            await request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`);

            await request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(403);
        });

        it("should return 401, if user does not login", () =>
            request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .expect(401));

        it("report_count should 1, if post report and get experience", async () => {
            await request(app)
                .post(`/experiences/${experience_id_str}/reports`)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`);

            const experience = await db.collection("experiences").findOne({
                _id: new ObjectId(experience_id_str),
            });

            assert.equal(experience.report_count, 1);
        });

        it("(! Need Index), report_count should be 1, if post report 2 times (same user) and get experience", async () => {
            const uri = `/experiences/${experience_id_str}/reports`;
            await request(app)
                .post(uri)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`);
            await request(app)
                .post(uri)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`);

            const experience = await db.collection("experiences").findOne({
                _id: new ObjectId(experience_id_str),
            });

            assert.equal(experience.report_count, 1);
        });

        it("report_count should be 2 , if post report 2 times(different user) and get experience", async () => {
            const uri = `/experiences/${experience_id_str}/reports`;
            await request(app)
                .post(uri)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_user_token}`);
            await request(app)
                .post(uri)
                .send(generatePayload())
                .set("Authorization", `Bearer ${fake_other_user_token}`);

            const experience = await db.collection("experiences").findOne({
                _id: new ObjectId(experience_id_str),
            });

            assert.equal(experience.report_count, 2);
        });

        afterEach(async () => {
            await db.collection("reports").deleteMany({});
            await db.collection("experiences").deleteMany({});
            await fake_user_factory.tearDown();
        });
    });

    describe("GET /experiences/:id/reports", () => {
        let experience_id_str;
        const fake_user = {
            _id: new ObjectId(),
            facebook_id: "-1",
            facebook: {
                id: "-1",
                name: "markLin",
            },
        };
        const fake_other_user = {
            _id: new ObjectId(),
            facebook_id: "-2",
            facebook: {
                id: "-2",
                name: "markChen",
            },
        };

        before("create test data", async () => {
            const result = await db.collection("experiences").insertOne({
                type: "interview",
                author_id: fake_user._id,
                report_count: 2,
            });
            experience_id_str = result.insertedId.toString();

            const testData = {
                created_at: new Date(),
                user_id: fake_user._id,
                reason_category: "我認為這篇文章內容不實",
                reason: "This is not true",
                ref: DBRef("experiences", ObjectId(experience_id_str)),
            };
            const testData2 = {
                created_at: new Date(),
                user_id: fake_other_user._id,
                reason_category: "我認為這篇文章內容不實",
                reason: "This is not true",
                ref: DBRef("experiences", ObjectId(experience_id_str)),
            };

            await db.collection("reports").insertOne(testData);
            await db.collection("reports").insertOne(testData2);
        });

        it("should get reports, and the fields are correct", () =>
            request(app)
                .get(`/experiences/${experience_id_str}/reports`)
                .expect(200)
                .expect(res => {
                    assert.property(res.body, "reports");
                    assert.isArray(res.body.reports);
                    assert.lengthOf(res.body.reports, 2);
                    assert.notDeepProperty(res.body, "reports.0.user_id");
                    assert.deepProperty(res.body, "reports.0.reason");
                    assert.deepProperty(res.body, "reports.0.reason_category");
                    assert.deepProperty(res.body, "reports.0.created_at");
                    assert.notDeepProperty(res.body, "reports.1.user_id");
                    assert.deepProperty(res.body, "reports.1.reason");
                    assert.deepProperty(res.body, "reports.1.reason_category");
                    assert.deepProperty(res.body, "reports.1.created_at");
                }));

        it("set error reports and expect error code 404", () =>
            request(app)
                .get("/experiences/1111/reports")
                .expect(404));

        it("limit = 2000  and expect error code 402", () =>
            request(app)
                .get(`/experiences/${experience_id_str}/reports`)
                .query({
                    limit: 2000,
                })
                .expect(422));

        after(async () => {
            await db.collection("reports").deleteMany({});
            await db.collection("experiences").deleteMany({});
            await db.collection("repoerts").deleteMany({});
        });
    });
});
