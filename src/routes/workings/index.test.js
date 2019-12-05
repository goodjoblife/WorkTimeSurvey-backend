const chai = require("chai");
chai.use(require("chai-datetime"));

const assert = chai.assert;
const request = require("supertest");
const app = require("../../app");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const { generateWorkingData } = require("../experiences/testData");
const { FakeUserFactory } = require("../../utils/test_helper");

describe("Workings 工時資訊", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("GET /workings/companies/search", () => {
        before("Seeding some workings", () =>
            db.collection("workings").insertMany([
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 10,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 20,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB2",
                    week_work_time: 20,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "YOUR GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 25,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "OTHER BADJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 40,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "OTHER BADJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 40,
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                },
            ])
        );

        it("error 422 if no key provided", () =>
            request(app)
                .get("/workings/companies/search")
                .expect(422));

        it("正確搜尋出公司名稱", () =>
            request(app)
                .get("/workings/companies/search")
                .query({ key: "GOODJOB" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, "0._id");
                }));

        it("小寫關鍵字轉換成大寫", () =>
            request(app)
                .get("/workings/companies/search")
                .query({ key: "goodjob" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, "0._id");
                }));

        after(() => db.collection("workings").deleteMany({}));
    });

    describe("GET /workings/jobs/search", () => {
        before("Seeding some workings", () =>
            db.collection("workings").insertMany([
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 10,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 20,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        id: "00000001",
                        name: "MY GOODJOB COMPANY",
                    },
                    job_title: "JOB2",
                    week_work_time: 20,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "YOUR GOODJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 25,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "OTHER BADJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 40,
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: {
                        name: "OTHER BADJOB COMPANY",
                    },
                    job_title: "JOB1",
                    week_work_time: 40,
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                },
            ])
        );

        it("error 422 if no key provided", () =>
            request(app)
                .get("/workings/jobs/search")
                .expect(422));

        it("正確搜尋出職稱", () =>
            request(app)
                .get("/workings/jobs/search")
                .query({ key: "JOB" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, "0._id");
                }));

        it("正確搜尋出職稱", () =>
            request(app)
                .get("/workings/jobs/search")
                .query({ key: "JOB1" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 1);
                    assert.deepProperty(res.body, "0._id");
                }));

        it("小寫關鍵字轉換成大寫", () =>
            request(app)
                .get("/workings/jobs/search")
                .query({ key: "job" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, "0._id");
                }));

        after(() => db.collection("workings").deleteMany({}));
    });
    describe("PATCH /workings/:id", () => {
        const fake_user_factory = new FakeUserFactory();
        let user_working_id;
        let other_user_working_id;
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
                name: "lin",
            },
        };
        let fake_user_token;

        before(async () => {
            await fake_user_factory.setUp();
        });

        before("Create some users", async () => {
            fake_user_token = await fake_user_factory.create(fake_user);
            await fake_user_factory.create(fake_other_user);
        });

        after(async () => {
            await fake_user_factory.tearDown();
        });

        before("Seeding some workings", async () => {
            const user_working = Object.assign(generateWorkingData(), {
                status: "published",
                user_id: fake_user._id,
            });
            const other_user_working = Object.assign(generateWorkingData(), {
                status: "published",
                user_id: fake_other_user._id,
            });
            const result = await db
                .collection("workings")
                .insertMany([user_working, other_user_working]);
            user_working_id = result.insertedIds[0];
            other_user_working_id = result.insertedIds[1];
        });

        it("should return 200, when user updates his working", async () => {
            const res = await request(app)
                .patch(`/workings/${user_working_id.toString()}`)
                .send({
                    status: "hidden",
                })
                .set("Authorization", `Bearer ${fake_user_token}`);

            assert.equal(res.status, 200);
            assert.isTrue(res.body.success);
            assert.equal(res.body.status, "hidden");

            const working = await db.collection("workings").findOne({
                _id: user_working_id,
            });
            assert.equal(working.status, "hidden");
        });

        it("should return 401, when user did not login", async () => {
            const res = await request(app)
                .patch(`/workings/${user_working_id.toString()}`)
                .send({
                    status: "hidden",
                });

            assert.equal(res.status, 401);
        });

        it("should return 422, when status is invalid", async () => {
            const res = await request(app)
                .patch(`/workings/${user_working_id.toString()}`)
                .send({
                    status: "xxxxxx",
                })
                .set("Authorization", `Bearer ${fake_user_token}`);

            assert.equal(res.status, 422);
        });

        it("should return 403, when user want to update not belong to his working", async () => {
            const res = await request(app)
                .patch(`/workings/${other_user_working_id.toString()}`)
                .send({
                    status: "hidden",
                })
                .set("Authorization", `Bearer ${fake_user_token}`);
            assert.equal(res.status, 403);
        });

        it("should return 422, when user did not set the status field", async () => {
            const res = await request(app)
                .patch(`/workings/${user_working_id}`)
                .send({})
                .set("Authorization", `Bearer ${fake_user_token}`);
            assert.equal(res.status, 422);
        });

        it("should return 404, when the working id is invalid", async () => {
            const res = await request(app)
                .patch(`/workings/xxxxxxxx`)
                .send({
                    status: "published",
                })
                .set("Authorization", `Bearer ${fake_user_token}`);
            assert.equal(res.status, 404);
        });

        it("should return 404, when the working is does not exist", async () => {
            const res = await request(app)
                .patch(`/working/${new ObjectId().toString()}`)
                .send({
                    status: "published",
                })
                .set("Authorization", `Bearer ${fake_user_token}`);
            assert.equal(res.status, 404);
        });

        after(() => db.collection("workings").deleteMany({}));
    });

    describe("GET /workings/campaigns/:campaign_name", () => {
        before("Seeding some workings", () =>
            db.collection("workings").insertMany([
                {
                    company: { name: "companyA" },
                    created_at: new Date("2017-11-13T00:00:00.000Z"),
                    job_title: "ENGINEER1",
                    week_work_time: 40,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 100,
                    data_time: { year: 2016, month: 10 },
                    status: "published",
                    campaign_name: "engineer",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyB" },
                    created_at: new Date("2017-11-10T00:00:00.000Z"),
                    job_title: "ENGINEER2",
                    week_work_time: 47.5,
                    overtime_frequency: 3,
                    data_time: { year: 2016, month: 10 },
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyC" },
                    created_at: new Date("2017-11-14T00:00:00.000Z"),
                    job_title: "ENGINEER3",
                    week_work_time: 50,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 120,
                    data_time: { year: 2016, month: 10 },
                    status: "published",
                    campaign_name: "engineer",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyC" },
                    created_at: new Date("2017-11-14T00:00:00.000Z"),
                    job_title: "ENGINEER3",
                    week_work_time: 50,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 120,
                    data_time: { year: 2016, month: 10 },
                    status: "published",
                    campaign_name: "engineer",
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                },
            ])
        );

        it("query with campaign_name", async () => {
            const res = await request(app)
                .get("/workings/campaigns/engineer")
                .expect(200);
            assert.propertyVal(res.body, "total", 2);
            assert.property(res.body, "time_and_salary");
            assert.lengthOf(res.body.time_and_salary, 2);
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.0.campaign_name",
                "engineer"
            );
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.0.estimated_hourly_wage",
                120
            );
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.1.estimated_hourly_wage",
                100
            );
        });

        it("query with job_titles", async () => {
            const res = await request(app)
                .get("/workings/campaigns/engineer?job_titles[]=engineer2")
                .expect(200);
            assert.propertyVal(res.body, "total", 3);
            assert.property(res.body, "time_and_salary");
            assert.lengthOf(res.body.time_and_salary, 3);
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.0.campaign_name",
                "engineer"
            );
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.0.estimated_hourly_wage",
                120
            );
            assert.deepPropertyVal(
                res.body,
                "time_and_salary.2.job_title",
                "ENGINEER2"
            );
        });

        it("job_titles should be array", async () => {
            await request(app)
                .get("/workings/campaigns/engineer?job_titles=engineer2")
                .expect(422);
        });

        after(() => db.collection("workings").deleteMany({}));
    });
});
