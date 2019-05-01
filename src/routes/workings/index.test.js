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

    describe("GET /workings", () => {
        before("Seeding some workings", () =>
            db.collection("workings").insertMany([
                {
                    company: { name: "companyA" },
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer1",
                    week_work_time: 40,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 100,
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyC" },
                    created_at: new Date("2016-11-13T17:10:04.023Z"),
                    job_title: "engineer3",
                    week_work_time: 50,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 120,
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyB" },
                    created_at: new Date("2016-11-13T01:59:18.055Z"),
                    job_title: "engineer2",
                    week_work_time: 47.5,
                    overtime_frequency: 3,
                    // 有的沒有薪資資訊，當然也不會有估計時薪
                    data_time: { year: 2016, month: 10 },
                    sector: "Tainan",
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyB" },
                    created_at: new Date("2016-11-13T01:58:18.055Z"),
                    job_title: "engineer2",
                    // 有的沒有工時資訊，如果不是時薪，不會有估計時薪
                    salary: { amount: 22000, type: "month" },
                    data_time: { year: 2016, month: 10 },
                    sector: "Tainan",
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyD" },
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer1",
                    week_work_time: 40,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 100,
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "hidden",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                },
                {
                    company: { name: "companyF" },
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer12",
                    week_work_time: 40,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: 100,
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "published",
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                },
            ])
        );

        for (let sort_field of [
            undefined,
            "created_at",
            "week_work_time",
            "estimated_hourly_wage",
        ]) {
            it(`return the pagination with SORT_FIELD: ${sort_field}`, () =>
                request(app)
                    .get("/workings")
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200)
                    .expect(res => {
                        assert.propertyVal(res.body, "total", 4);
                        assert.property(res.body, "time_and_salary");
                        assert.lengthOf(res.body.time_and_salary, 4);
                    }));

            it(`return correct default order with SORT_FIELD: ${sort_field}`, async () => {
                const res = await request(app)
                    .get("/workings")
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200);

                if (sort_field === undefined) {
                    sort_field = "created_at";
                }

                const workings = res.body.time_and_salary;
                let undefined_start_idx = workings.length;

                for (const idx in workings) {
                    if (workings[idx][sort_field] === undefined) {
                        undefined_start_idx = idx;
                        break;
                    }
                }

                for (let idx = 1; idx < undefined_start_idx; idx += 1) {
                    assert(
                        workings[idx][sort_field] <=
                            workings[idx - 1][sort_field]
                    );
                }
                for (
                    let idx = undefined_start_idx;
                    idx < workings.length;
                    idx += 1
                ) {
                    assert.isUndefined(workings[idx][sort_field]);
                }
            });
        }

        it(`sort_by ascending order with default SORT_FIELD 'created_at'`, () =>
            request(app)
                .get("/workings")
                .query({
                    order: "ascending",
                })
                .expect(200)
                .expect(res => {
                    // sort_field default is field 'created_at'
                    const sort_field = "created_at";
                    const workings = res.body.time_and_salary;

                    for (let idx = 1; idx < workings.length; idx += 1) {
                        assert(
                            workings[idx][sort_field] >=
                                workings[idx - 1][sort_field]
                        );
                    }
                }));

        it(`sort_by ascending order with SORT_FIELD 'week_work_time'`, async () => {
            const res = await request(app)
                .get("/workings")
                .query({
                    sort_by: "week_work_time",
                    order: "ascending",
                })
                .expect(200);

            const sort_field = "week_work_time";
            const workings = res.body.time_and_salary;

            const undefined_idx = 3;
            for (let idx = 1; idx < undefined_idx; idx += 1) {
                assert(
                    workings[idx][sort_field] >= workings[idx - 1][sort_field]
                );
            }
            for (let idx = undefined_idx; idx < workings.length; idx += 1) {
                assert.isUndefined(workings[idx][sort_field]);
            }
        });

        it(`欄位是 undefined 的資料全部會被放在 defined 的資料的後面`, () =>
            request(app)
                .get("/workings")
                .query({
                    sort_by: "week_work_time",
                    order: "ascending",
                    limit: "2",
                    page: "1",
                })
                .expect(200)
                .expect(res => {
                    const sort_field = "week_work_time";
                    const workings = res.body.time_and_salary;

                    assert.isDefined(workings[0][sort_field]);
                    assert.isUndefined(workings[1][sort_field]);
                }));

        after(() => db.collection("workings").deleteMany({}));
    });

    describe("GET /workings (左右極端值的測試)", () => {
        describe("有資料的欄位夠多", () => {
            before("Seeding some workings", () => {
                const workings = Array.from({ length: 200 }).map((v, i) => ({
                    company: { name: "companyA" },
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer1",
                    week_work_time: 40 - i * 0.1,
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    estimated_hourly_wage: (i + 1) * 100, // 100 ~ 20000
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                }));
                return db.collection("workings").insertMany(workings);
            });

            it(`skip 1% data, ascending`, async () => {
                const res = await request(app)
                    .get("/workings")
                    .query({
                        sort_by: "estimated_hourly_wage",
                        order: "ascending",
                        skip: "true",
                    })
                    .expect(200);
                assert.propertyVal(res.body, "total", 200);
                assert.property(res.body, "time_and_salary");
                assert.lengthOf(res.body.time_and_salary, 25);
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.0.estimated_hourly_wage",
                    300
                );
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.24.estimated_hourly_wage",
                    2700
                );
            });

            it(`skip 1% data, descending`, async () => {
                const res = await request(app)
                    .get("/workings")
                    .query({
                        sort_by: "estimated_hourly_wage",
                        order: "descending",
                        skip: "true",
                    })
                    .expect(200);
                assert.propertyVal(res.body, "total", 200);
                assert.property(res.body, "time_and_salary");
                assert.lengthOf(res.body.time_and_salary, 25);
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.0.estimated_hourly_wage",
                    19800
                );
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.1.estimated_hourly_wage",
                    19700
                );
            });

            after(() => db.collection("workings").deleteMany({}));
        });

        describe("有資料的欄位不夠多", () => {
            before("Seeding some workings", async () => {
                await db.collection("workings").insertMany([
                    {
                        company: { name: "companyA" },
                        created_at: new Date("2016-11-13T06:10:04.023Z"),
                        job_title: "engineer1",
                        week_work_time: 40,
                        overtime_frequency: 1,
                        salary: { amount: 22000, type: "month" },
                        estimated_hourly_wage: 100,
                        data_time: { year: 2016, month: 10 },
                        sector: "Taipei",
                        status: "published",
                        archive: {
                            is_archived: false,
                            reason: "",
                        },
                    },
                    {
                        company: { name: "companyA" },
                        created_at: new Date("2016-11-13T06:10:04.023Z"),
                        job_title: "engineer1",
                        week_work_time: 40,
                        overtime_frequency: 1,
                        salary: { amount: 22000, type: "month" },
                        estimated_hourly_wage: 200,
                        data_time: { year: 2016, month: 10 },
                        sector: "Taipei",
                        status: "published",
                        archive: {
                            is_archived: false,
                            reason: "",
                        },
                    },
                    {
                        company: { name: "companyA" },
                        created_at: new Date("2016-11-13T06:10:04.023Z"),
                        job_title: "engineer1",
                        week_work_time: 40,
                        overtime_frequency: 1,
                        salary: { amount: 22000, type: "month" },
                        estimated_hourly_wage: 200,
                        data_time: { year: 2016, month: 10 },
                        sector: "Taipei",
                        status: "hidden",
                        archive: {
                            is_archived: false,
                            reason: "",
                        },
                    },
                    {
                        company: { name: "companyA" },
                        created_at: new Date("2016-11-13T06:10:04.023Z"),
                        job_title: "engineer1",
                        week_work_time: 40,
                        overtime_frequency: 1,
                        salary: { amount: 22000, type: "month" },
                        estimated_hourly_wage: 200,
                        data_time: { year: 2016, month: 10 },
                        sector: "Taipei",
                        status: "published",
                        archive: {
                            is_archived: true,
                            reason: "廢文一篇",
                        },
                    },
                ]);

                const workings = Array.from({ length: 298 }).map(() => ({
                    company: { name: "companyA" },
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer1",
                    overtime_frequency: 1,
                    salary: { amount: 22000, type: "month" },
                    data_time: { year: 2016, month: 10 },
                    sector: "Taipei", // optional
                    status: "published",
                    archive: {
                        is_archived: false,
                        reason: "",
                    },
                }));
                return db.collection("workings").insertMany(workings);
            });

            it(`skip 1% data, ascending`, async () => {
                const res = await request(app)
                    .get("/workings/extreme")
                    .query({
                        sort_by: "estimated_hourly_wage",
                        order: "ascending",
                        skip: "true",
                    })
                    .expect(200);
                assert.property(res.body, "time_and_salary");
                assert.lengthOf(res.body.time_and_salary, 3);
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.0.estimated_hourly_wage",
                    100
                );
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.1.estimated_hourly_wage",
                    200,
                    "in ascending order"
                );
                assert.deepProperty(res.body, "time_and_salary.2");
                assert.notProperty(
                    res.body.time_and_salary[2],
                    "estimated_hourly_wage",
                    "should not exist"
                );
            });

            it(`skip 1% data, descending`, async () => {
                const res = await request(app)
                    .get("/workings/extreme")
                    .query({
                        sort_by: "estimated_hourly_wage",
                        order: "descending",
                        skip: "true",
                    })
                    .expect(200);
                assert.property(res.body, "time_and_salary");
                assert.lengthOf(res.body.time_and_salary, 3);
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.0.estimated_hourly_wage",
                    200
                );
                assert.deepPropertyVal(
                    res.body,
                    "time_and_salary.1.estimated_hourly_wage",
                    100,
                    "in descending order"
                );
                assert.deepProperty(res.body, "time_and_salary.2");
                assert.notProperty(
                    res.body.time_and_salary[2],
                    "estimated_hourly_wage"
                );
            });

            after(() => db.collection("workings").deleteMany({}));
        });
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
                author: {
                    type: "facebook",
                    id: fake_user.facebook_id,
                },
            });
            const other_user_working = Object.assign(generateWorkingData(), {
                status: "published",
                author: {
                    type: "facebook",
                    id: fake_other_user.facebook_id,
                },
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
