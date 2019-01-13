const chai = require("chai");
chai.use(require("chai-datetime"));

const assert = chai.assert;
const request = require("supertest");
const app = require("../../app");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const sinon = require("sinon");
const authentication = require("../../libs/authentication");
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require("./testData");

const create_company_keyword_collection = require("../../database/migrations/create-companyKeywords-collection");
const create_title_keyword_collection = require("../../database/migrations/create-jobTitleKeywords-collection");

describe("Experiences 面試和工作經驗資訊", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("GET /experiences/:id", () => {
        let interview_experience_id_str = null;
        let work_experience_id_str = null;
        let interview_hidden_experience_id_str = null;
        let sandbox = null;
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

        before("Mock", () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(
                authentication,
                "cachedFacebookAuthentication"
            );
            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeaccesstoken"
                )
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeOtheraccesstoken"
                )
                .resolves(fake_other_user);
        });

        before("Seed experiences collection", async () => {
            const experiences = await db.collection("experiences").insertMany([
                generateInterviewExperienceData(),
                generateWorkExperienceData(),
                Object.assign(generateInterviewExperienceData(), {
                    status: "hidden",
                }),
            ]);

            interview_experience_id_str = experiences.insertedIds[0].toString();
            work_experience_id_str = experiences.insertedIds[1].toString();
            interview_hidden_experience_id_str = experiences.insertedIds[2].toString();
        });

        before("Seed experience_likes collection", async () => {
            await db.collection("experience_likes").insertOne({
                created_at: new Date(),
                user_id: fake_other_user._id,
                experience_id: new ObjectId(interview_experience_id_str),
            });
        });

        it("should not see liked if not authenticated", async () => {
            const res = await request(app)
                .get(`/experiences/${interview_experience_id_str}`)
                .expect(200);

            assert.equal(res.body._id, interview_experience_id_str);
            assert.notDeepProperty(res.body, "author_id");
            assert.notDeepProperty(res.body, "liked");
        });

        it("should see liked = true if authenticated user liked", async () => {
            const res = await request(app)
                .get(`/experiences/${interview_experience_id_str}`)
                .send({
                    access_token: "fakeOtheraccesstoken",
                })
                .expect(200);

            assert.equal(res.body._id, interview_experience_id_str);
            assert.notDeepProperty(res.body, "author_id");
            assert.isTrue(res.body.liked);
        });

        it("should see liked = false if authenticated user not liked", async () => {
            const res = await request(app)
                .get(`/experiences/${interview_experience_id_str}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            assert.equal(res.body._id, interview_experience_id_str);
            assert.notDeepProperty(res.body, "author_id");
            assert.isFalse(res.body.liked);
        });

        it("should be status 404 NotFound if experiences does not exist", () =>
            request(app)
                .get("/experiences/123XXX")
                .expect(404));

        it("should get one interview experience, and it returns correct fields", async () => {
            const res = await request(app)
                .get(`/experiences/${interview_experience_id_str}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            const experience = res.body;
            assert.property(experience, "_id");
            assert.propertyVal(experience, "type", "interview");
            assert.property(experience, "company");
            assert.deepProperty(experience, "company.name");
            assert.property(experience, "region");
            assert.property(experience, "job_title");
            assert.property(experience, "title");
            assert.property(experience, "sections");
            assert.property(experience, "experience_in_year");
            assert.property(experience, "education");
            assert.property(experience, "like_count");
            assert.property(experience, "reply_count");
            assert.property(experience, "report_count");
            assert.property(experience, "created_at");
            assert.property(experience, "liked");

            assert.property(experience, "interview_time");
            assert.deepProperty(experience, "interview_time.year");
            assert.deepProperty(experience, "interview_time.month");
            assert.property(experience, "interview_result");
            assert.property(experience, "overall_rating");
            assert.property(experience, "salary");
            assert.deepProperty(experience, "salary.type");
            assert.deepProperty(experience, "salary.amount");
            assert.property(experience, "interview_sensitive_questions");
            assert.property(experience, "interview_qas");

            assert.notProperty(experience, "author_id");
        });

        it("should get one work experience, and it returns correct fields ", async () => {
            const res = await request(app)
                .get(`/experiences/${work_experience_id_str}`)
                .send({
                    access_token: "fakeaccesstoken",
                })
                .expect(200);

            const experience = res.body;
            assert.property(experience, "_id");
            assert.propertyVal(experience, "type", "work");
            assert.property(experience, "company");
            assert.deepProperty(experience, "company.name");
            assert.property(experience, "region");
            assert.property(experience, "job_title");
            assert.property(experience, "title");
            assert.property(experience, "sections");
            assert.property(experience, "experience_in_year");
            assert.property(experience, "education");
            assert.property(experience, "like_count");
            assert.property(experience, "reply_count");
            assert.property(experience, "report_count");
            assert.property(experience, "created_at");
            assert.property(experience, "liked");

            assert.property(experience, "salary");
            assert.deepProperty(experience, "salary.type");
            assert.deepProperty(experience, "salary.amount");
            assert.property(experience, "week_work_time");
            assert.property(experience, "data_time");
            assert.property(experience, "recommend_to_others");

            assert.notProperty(experience, "author_id");
        });

        it("should be forbidden, when the status of experience is hidden", async () => {
            const res = await request(app)
                .get(`/experiences/${interview_hidden_experience_id_str}`)
                .send({
                    access_token: "fakeaccesstoken",
                });

            assert.equal(res.status, 403);
        });

        after(() => db.collection("experiences").deleteMany({}));

        after(() => db.collection("experience_likes").deleteMany({}));

        after(() => {
            sandbox.restore();
        });
    });

    describe("GET /experiences", () => {
        before("Key word before", () =>
            db.collections().then(result => {
                const target_collections = result.map(
                    collection => collection.collectionName
                );

                if (
                    target_collections.indexOf("search_by_company_keywords") ===
                        -1 &&
                    target_collections.indexOf(
                        "earch_by_job_title_keywords"
                    ) === -1
                ) {
                    return Promise.all([
                        create_company_keyword_collection(db),
                        create_title_keyword_collection(db),
                    ]);
                }

                if (
                    target_collections.indexOf("search_by_company_keywords") ===
                    -1
                ) {
                    return create_company_keyword_collection(db);
                }
                if (
                    target_collections.indexOf(
                        "earch_by_job_title_keywords"
                    ) === -1
                ) {
                    return create_title_keyword_collection(db);
                }
            })
        );

        before("Seeding some experiences", () => {
            const inter_data_1 = Object.assign(
                generateInterviewExperienceData(),
                {
                    company: {
                        name: "GOODJOB1",
                        id: "123",
                    },
                    job_title: "SW ENGINEER",
                    created_at: new Date("2017-03-20T10:00:00.929Z"),
                    like_count: 10,
                }
            );

            const inter_data_2 = Object.assign(
                generateInterviewExperienceData(),
                {
                    company: {
                        name: "BADJOB",
                        id: "321",
                    },
                    job_title: "HW ENGINEER",
                    created_at: new Date("2017-03-22T10:00:00.929Z"),
                    like_count: 5,
                }
            );

            const work_data_1 = Object.assign(generateWorkExperienceData(), {
                company: {
                    name: "GOODJOB2",
                    id: "456",
                },
                job_title: "ENGINEER",
                created_at: new Date("2017-03-21T10:00:00.929Z"),
                like_count: 9,
            });

            const work_data_2 = Object.assign(generateWorkExperienceData(), {
                company: {
                    name: "GOODJOB1",
                    id: "123",
                },
                job_title: "F2E",
                created_at: new Date("2017-03-25T10:00:00.929Z"),
                like_count: 0,
            });

            const work_data_3 = Object.assign(generateWorkExperienceData(), {
                company: {
                    name: "GOODJOB1",
                    id: "123",
                },
                job_title: "F2E",
                created_at: new Date("2017-03-25T10:00:00.929Z"),
                like_count: 0,
                status: "hidden",
            });

            const archived_work_data_1 = Object.assign(
                generateWorkExperienceData(),
                {
                    company: {
                        name: "ARC_2",
                        id: "123_a",
                    },
                    job_title: "F2E",
                    created_at: new Date("2017-03-25T10:00:00.929Z"),
                    like_count: 0,
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                }
            );

            const archived_intr_data_1 = Object.assign(
                generateInterviewExperienceData(),
                {
                    company: {
                        name: "ARC_1",
                        id: "321_a",
                    },
                    job_title: "HB ENGINEER",
                    created_at: new Date("2017-03-22T10:00:00.929Z"),
                    like_count: 5,
                    archive: {
                        is_archived: true,
                        reason: "廢文一篇",
                    },
                }
            );

            return db
                .collection("experiences")
                .insertMany([
                    inter_data_1,
                    work_data_1,
                    inter_data_2,
                    work_data_2,
                    work_data_3,
                    archived_work_data_1,
                    archived_intr_data_1,
                ]);
        });

        it('應該回傳"全部"的資料，當沒有 query', async () => {
            const res = await request(app)
                .get("/experiences")
                .expect(200);

            assert.propertyVal(res.body, "total", 4);
            assert.property(res.body, "experiences");
            assert.lengthOf(res.body.experiences, 4);
        });

        it(`搜尋 company 正確`, async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "GOODJOB2",
                    search_by: "company",
                })
                .expect(200);

            assert.property(res.body, "experiences");
            assert.lengthOf(res.body.experiences, 1);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "GOODJOB2",
                id: "456",
            });
            assert.propertyVal(
                res.body.experiences[0],
                "job_title",
                "ENGINEER"
            );
        });

        it("搜尋 job_title 正確", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "HW ENGINEER",
                    search_by: "job_title",
                })
                .expect(200);

            assert.property(res.body, "experiences");
            assert.lengthOf(res.body.experiences, 1);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "BADJOB",
                id: "321",
            });
            assert.propertyVal(
                res.body.experiences[0],
                "job_title",
                "HW ENGINEER"
            );
        });

        it("搜尋 company, 小寫 search_query 轉換成大寫", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "GoodJob1",
                    search_by: "company",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 2);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "GOODJOB1",
                id: "123",
            });
        });

        it("搜尋 company, match any substring in company.name", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "GOODJOB",
                    search_by: "company",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 3);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "GOODJOB1",
                id: "123",
            });
            assert.deepEqual(res.body.experiences[1].company, {
                name: "GOODJOB2",
                id: "456",
            });
            assert.deepEqual(res.body.experiences[2].company, {
                name: "GOODJOB1",
                id: "123",
            });
        });

        it("依照 sort (created_at) 排序", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    sort: "created_at",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 4);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "GOODJOB1",
                id: "123",
            }); // 2017-03-25T10:00:00.929Z
            assert.deepEqual(res.body.experiences[1].company, {
                name: "BADJOB",
                id: "321",
            }); // 2017-03-22T10:00:00.929Z
            assert.deepEqual(res.body.experiences[2].company, {
                name: "GOODJOB2",
                id: "456",
            }); // 2017-03-21T10:00:00.929Z
            assert.deepEqual(res.body.experiences[3].company, {
                name: "GOODJOB1",
                id: "123",
            }); // 2017-03-20T10:00:00.929Z
        });

        it("搜尋 company, 根據統編搜尋", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "123",
                    search_by: "company",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 2);
            assert.deepEqual(res.body.experiences[0].company, {
                name: "GOODJOB1",
                id: "123",
            });
            assert.deepEqual(res.body.experiences[1].company, {
                name: "GOODJOB1",
                id: "123",
            });
        });

        it("should be status 422 當 search_by 不符合規定之種類", () =>
            request(app)
                .get("/experiences")
                .query({
                    search_query: "321",
                    search_by: "xxxxx",
                })
                .expect(422));

        it("should be status 422 當 sort 不符合規定之種類", () =>
            request(app)
                .get("/experiences")
                .query({
                    sort: "xxxxx",
                })
                .expect(422));

        it("驗證『面試經驗』回傳欄位", async () => {
            const res = await request(app)
                .get("/experiences")
                .expect(200);

            assert.property(res.body, "total");
            assert.property(res.body, "experiences");
            const experience = res.body.experiences[3];
            assert.property(experience, "_id");
            assert.propertyVal(experience, "type", "interview");
            assert.property(experience, "created_at");
            assert.property(experience, "company");
            assert.property(experience, "job_title");
            assert.property(experience, "title");
            assert.property(experience, "preview");
            assert.property(experience, "like_count");
            assert.property(experience, "reply_count");
            assert.property(experience, "report_count");

            assert.notProperty(experience, "author_id");
            assert.notProperty(experience, "overall_rating");
            assert.notProperty(experience, "sections");
            assert.notProperty(experience, "experience_in_year");
            assert.notProperty(experience, "education");
            assert.notProperty(experience, "interview_time");
            assert.notProperty(experience, "interview_qas");
            assert.notProperty(experience, "interview_result");
            assert.notProperty(experience, "interview_sensitive_questions");
        });

        it("驗證『工作經驗』回傳欄位", async () => {
            const res = await request(app)
                .get("/experiences")
                .expect(200);

            assert.property(res.body, "total");
            assert.property(res.body, "experiences");
            const experience = res.body.experiences[2];
            assert.property(experience, "_id");
            assert.propertyVal(experience, "type", "work");
            assert.property(experience, "created_at");
            assert.property(experience, "company");
            assert.property(experience, "region");
            assert.property(experience, "job_title");
            assert.property(experience, "title");
            assert.property(experience, "preview");
            assert.property(experience, "salary");
            assert.property(experience, "week_work_time");
            assert.property(experience, "like_count");
            assert.property(experience, "reply_count");
            assert.property(experience, "report_count");

            assert.notProperty(experience, "author_id");
            assert.notProperty(experience, "sections");
            assert.notProperty(experience, "experience_in_year");
            assert.notProperty(experience, "education");
            assert.notProperty(experience, "recommend_to_others");
            assert.notProperty(experience, "is_currently_employed");
            assert.notProperty(experience, "job_ending_time");
            assert.notProperty(experience, "data_time");
        });

        it('type = "interview" 正確取得 面試經驗', async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    type: "interview",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 2);
            assert.propertyVal(res.body.experiences[0], "type", "interview");
        });

        it('type = "work" 正確取得 工作經驗', async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    type: "work",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 2);
            assert.propertyVal(res.body.experiences[0], "type", "work");
        });

        it('搜尋 company 與 type = "interview" (search_query = "GoodJob1", search_by = "company")，預期回傳 1 筆資料', async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    search_query: "GOODJOB1",
                    search_by: "company",
                    type: "interview",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 1);
            assert.propertyVal(
                res.body.experiences[0],
                "like_count",
                10,
                "驗證是特定一筆"
            );
        });

        it("should be status 422 當給定 search_query 卻沒有 search_by", () =>
            request(app)
                .get("/experiences")
                .query({
                    search_query: "GOODJOB1",
                })
                .expect(422));

        it('type 聯合查詢 type = "work,interview" 正確取得 面試/工作經驗', async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    type: "work,interview",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 4);
        });

        it('search_by="company" type="interview" ，預期回傳2筆資料', async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    type: "interview",
                })
                .expect(200);

            assert.lengthOf(res.body.experiences, 2);
        });

        it("limit = 3, start = 0，預期回傳 3 筆資料", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    limit: 3,
                    start: 0,
                })
                .expect(200);

            assert.propertyVal(
                res.body,
                "total",
                4,
                "total 應該要是全部資料的數量"
            );
            assert.lengthOf(res.body.experiences, 3);
        });

        it("should be status 422 if limit = 0", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: 0,
                })
                .expect(422));

        it("should be status 422 if limit < 0", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: -1,
                })
                .expect(422));

        it("should be status 422 if limit > 100", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: 101,
                })
                .expect(422));

        it("should be status 422 if start < 0", () =>
            request(app)
                .get("/experiences")
                .query({
                    start: -1,
                })
                .expect(422));

        it("依照 sort (popularity) 排序，回傳的經驗根據 like_count 數值由大到小排列", async () => {
            const res = await request(app)
                .get("/experiences")
                .query({
                    sort: "popularity",
                })
                .expect(200);

            assert.property(res.body, "experiences");
            assert.lengthOf(res.body.experiences, 4);
            assert.propertyVal(res.body.experiences[0], "like_count", 10);
            assert.propertyVal(res.body.experiences[1], "like_count", 9);
            assert.propertyVal(res.body.experiences[2], "like_count", 5);
            assert.propertyVal(res.body.experiences[3], "like_count", 0);
        });

        after(() => db.collection("experiences").deleteMany({}));

        after(async () => {
            await db.collection("company_keywords").drop();
            await db.collection("job_title_keywords").drop();

            await create_title_keyword_collection(db);
            await create_company_keyword_collection(db);
        });
    });

    describe("PATCH /experiences/:id", () => {
        let sandbox;
        let user_experience_id_string;
        let other_user_experience_id_string;
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

        before("mock user", () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(
                authentication,
                "cachedFacebookAuthentication"
            );
            cachedFacebookAuthentication
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeaccesstoken"
                )
                .resolves(fake_user);
        });

        before("seeding the data", async () => {
            const inter_data_1 = Object.assign(
                generateInterviewExperienceData(),
                {
                    status: "published",
                    author_id: fake_user._id,
                }
            );
            const inter_data_2 = Object.assign(
                generateInterviewExperienceData(),
                {
                    status: "published",
                    author_id: fake_other_user._id,
                }
            );

            const insert_result = await db
                .collection("experiences")
                .insertMany([inter_data_1, inter_data_2]);
            user_experience_id_string = insert_result.insertedIds[0].toString();
            other_user_experience_id_string = insert_result.insertedIds[1].toString();
        });

        it("should return 200, while user updates his experience status", async () => {
            const res = await request(app)
                .patch(`/experiences/${user_experience_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "hidden",
                });

            assert.equal(res.status, 200);
            assert.isTrue(res.body.success);
            assert.equal(res.body.status, "hidden");

            const experience = await db.collection("experiences").findOne({
                _id: new ObjectId(user_experience_id_string),
            });
            assert.equal(experience.status, "hidden");
        });

        it("should return 401, while user did not login", async () => {
            const res = await request(app)
                .patch(`/experiences/${user_experience_id_string}`)
                .send({
                    status: "hidden",
                });

            assert.equal(res.status, 401);
        });

        it("should return 422, while user send error status", async () => {
            const res = await request(app)
                .patch(`/experiences/${user_experience_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "xxxxxx",
                });

            assert.equal(res.status, 422);
        });

        it("should return 403, while user want to update not belong to him experience", async () => {
            const res = await request(app)
                .patch(`/experiences/${other_user_experience_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "hidden",
                });
            assert.equal(res.status, 403);
        });

        it("should return 422, while user did not set the status field", async () => {
            const res = await request(app)
                .patch(`/experiences/${other_user_experience_id_string}`)
                .send({
                    access_token: "fakeaccesstoken",
                });
            assert.equal(res.status, 422);
        });

        it("should return 404, while the experience id is illegal", async () => {
            const res = await request(app)
                .patch(`/experiences/xxxxxxxx`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "published",
                });
            assert.equal(res.status, 404);
        });

        it("should return 404, while the experience is not exist", async () => {
            const res = await request(app)
                .patch(`/experiences/${new ObjectId().toString()}`)
                .send({
                    access_token: "fakeaccesstoken",
                    status: "published",
                });
            assert.equal(res.status, 404);
        });

        after(() => db.collection("experiences").deleteMany({}));

        after(() => {
            sandbox.restore();
        });
    });

    describe("GET /experiences/:id/recommended", () => {
        const num_of_data = 50;
        let experience_id_str;

        before("Seeding some experiences", async () => {
            const data_array = [];
            for (let i = 1; i <= num_of_data; i += 1) {
                data_array.push(
                    Object.assign(generateInterviewExperienceData(), {
                        like_count: i,
                    })
                );
            }

            const result = await db
                .collection("experiences")
                .insertMany(data_array);

            experience_id_str = result.insertedIds[num_of_data - 1]; // like_count of that experience is num_of_data
        });

        it("should return 10 recommended experiences, and query experience_id should be excluded", async () => {
            const res = await request(app)
                .get(`/experiences/${experience_id_str}/recommended`)
                .expect(200);
            assert.propertyVal(res.body, "total", 10);
            assert.property(res.body, "experiences");
            assert.lengthOf(res.body.experiences, 10);
            const largest_like_count = num_of_data - 20;
            for (let i = 0; i < 10; i += 1) {
                assert.isAbove(
                    res.body.experiences[i].like_count,
                    largest_like_count,
                    "like_count is greater than 30"
                );
            }
        });

        it("the query experience_id should be excluded (although this test is random)", async () => {
            const res = await request(app)
                .get(`/experiences/${experience_id_str}/recommended`)
                .expect(200);
            for (let i = 0; i < 10; i += 1) {
                assert.notEqual(
                    res.body.experiences[i].like_count,
                    num_of_data,
                    `like_count shouldn't be ${num_of_data} since the experience should be excluded`
                );
            }
        });

        it("should return correct fields if success", async () => {
            const res = await request(app)
                .get(`/experiences/${experience_id_str}/recommended`)
                .expect(200);

            assert.property(res.body, "total");
            assert.property(res.body, "experiences");
            const experience = res.body.experiences[3];
            assert.property(experience, "_id");
            assert.propertyVal(experience, "type", "interview");
            assert.property(experience, "created_at");
            assert.property(experience, "company");
            assert.property(experience, "job_title");
            assert.property(experience, "title");
            assert.property(experience, "preview");
            assert.property(experience, "like_count");
            assert.property(experience, "reply_count");
            assert.property(experience, "report_count");

            assert.notProperty(experience, "author_id");
            assert.notProperty(experience, "overall_rating");
            assert.notProperty(experience, "sections");
            assert.notProperty(experience, "experience_in_year");
            assert.notProperty(experience, "education");
            assert.notProperty(experience, "interview_time");
            assert.notProperty(experience, "interview_qas");
            assert.notProperty(experience, "interview_result");
            assert.notProperty(experience, "interview_sensitive_questions");
        });

        it("should be status 422 if limit = 0", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: 0,
                })
                .expect(422));

        it("should be status 422 if limit < 0", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: -1,
                })
                .expect(422));

        it("should be status 422 if limit > 100", () =>
            request(app)
                .get("/experiences")
                .query({
                    limit: 101,
                })
                .expect(422));

        after(() => db.collection("experiences").deleteMany({}));
    });
});
