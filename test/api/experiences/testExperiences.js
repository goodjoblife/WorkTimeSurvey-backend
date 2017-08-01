const chai = require('chai');
chai.use(require('chai-datetime'));

const assert = chai.assert;
const request = require('supertest');
const app = require('../../../app');
const {
    MongoClient,
    ObjectId,
} = require('mongodb');
const config = require('config');
const sinon = require('sinon');
require('sinon-as-promised');
const authentication = require('../../../libs/authentication');
const {
    generateInterviewExperienceData,
    generateWorkExperienceData,
} = require('../testData');

const create_company_keyword_collection = require('../../../database/migrations/create-companyKeywords-collection');
const create_title_keyword_collection = require('../../../database/migrations/create-jobTitleKeywords-collection');

describe('Experiences 面試和工作經驗資訊', () => {
    let db;

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    describe('GET /experiences/:id', () => {
        let test_interview_experience_id = null;
        let test_work_experience_id = null;
        let sandbox = null;
        const fake_user = {
            _id: new ObjectId(),
            facebook_id: '-1',
            facebook: {
                id: '-1',
                name: 'markLin',
            },
        };
        const fake_other_user = {
            _id: new ObjectId(),
            facebook_id: '-2',
            facebook: {
                id: '-2',
                name: 'markChen',
            },
        };

        before('Mock', () => {
            sandbox = sinon.sandbox.create();
            const cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
            cachedFacebookAuthentication
                .withArgs(sinon.match.object, sinon.match.object, 'fakeOtheraccesstoken')
                .resolves(fake_other_user);
        });

        before('Seed experiences collection', () => db.collection('experiences').insertMany([generateInterviewExperienceData(), generateWorkExperienceData()])
                .then((result) => {
                    test_interview_experience_id = result.insertedIds[0].toString();
                    test_work_experience_id = result.insertedIds[1].toString();
                }));

        before('Seed experience_likes collection', () => db.collection('experience_likes').insertOne({
            created_at: new Date(),
            user_id: fake_other_user._id,
            experience_id: new ObjectId(test_interview_experience_id),
        }));

        it('should not see liked if not authenticated', () => request(app).get(`/experiences/${test_interview_experience_id}`)
                .expect(200)
                .expect((res) => {
                    assert.equal(res.body._id, test_interview_experience_id);
                    assert.notDeepProperty(res.body, 'author_id');
                    assert.notDeepProperty(res.body, 'liked');
                }));

        it('should see liked = true if authenticated user liked', () => request(app).get(`/experiences/${test_interview_experience_id}`)
                .send({
                    access_token: 'fakeOtheraccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.equal(res.body._id, test_interview_experience_id);
                    assert.notDeepProperty(res.body, 'author_id');
                    assert.isTrue(res.body.liked);
                }));

        it('should see liked = false if authenticated user not liked', () => request(app).get(`/experiences/${test_interview_experience_id}`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.equal(res.body._id, test_interview_experience_id);
                    assert.notDeepProperty(res.body, 'author_id');
                    assert.isFalse(res.body.liked);
                }));

        it('should be status 404 NotFound if experiences does not exist', () => request(app).get("/experiences/123XXX")
                .expect(404));

        it('should get one interview experience, and it returns correct fields', () => request(app).get(`/experiences/${test_interview_experience_id}`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    const experience = res.body;
                    assert.property(experience, '_id');
                    assert.propertyVal(experience, 'type', 'interview');
                    assert.property(experience, 'company');
                    assert.deepProperty(experience, 'company.name');
                    assert.property(experience, 'region');
                    assert.property(experience, 'job_title');
                    assert.property(experience, 'title');
                    assert.property(experience, 'sections');
                    assert.property(experience, 'experience_in_year');
                    assert.property(experience, 'education');
                    assert.property(experience, 'like_count');
                    assert.property(experience, 'reply_count');
                    assert.property(experience, 'created_at');
                    assert.property(experience, 'liked');

                    assert.property(experience, 'interview_time');
                    assert.deepProperty(experience, 'interview_time.year');
                    assert.deepProperty(experience, 'interview_time.month');
                    assert.property(experience, 'interview_result');
                    assert.property(experience, 'overall_rating');
                    assert.property(experience, 'salary');
                    assert.deepProperty(experience, 'salary.type');
                    assert.deepProperty(experience, 'salary.amount');
                    assert.property(experience, 'interview_sensitive_questions');
                    assert.property(experience, 'interview_qas');

                    assert.notProperty(experience, 'author_id');
                }));

        it('should get one work experience, and it returns correct fields ', () => request(app).get(`/experiences/${test_work_experience_id}`)
                .send({
                    access_token: 'fakeaccesstoken',
                })
                .expect(200)
                .expect((res) => {
                    const experience = res.body;
                    assert.property(experience, '_id');
                    assert.propertyVal(experience, 'type', 'work');
                    assert.property(experience, 'company');
                    assert.deepProperty(experience, 'company.name');
                    assert.property(experience, 'region');
                    assert.property(experience, 'job_title');
                    assert.property(experience, 'title');
                    assert.property(experience, 'sections');
                    assert.property(experience, 'experience_in_year');
                    assert.property(experience, 'education');
                    assert.property(experience, 'like_count');
                    assert.property(experience, 'reply_count');
                    assert.property(experience, 'created_at');
                    assert.property(experience, 'liked');

                    assert.property(experience, 'salary');
                    assert.deepProperty(experience, 'salary.type');
                    assert.deepProperty(experience, 'salary.amount');
                    assert.property(experience, 'week_work_time');
                    assert.property(experience, 'data_time');
                    assert.property(experience, 'recommend_to_others');

                    assert.notProperty(experience, 'author_id');
                }));

        after(() => db.collection('experiences').deleteMany({}));

        after(() => db.collection('experience_likes').deleteMany({}));

        after(() => {
            sandbox.restore();
        });
    });

    describe('GET /experiences', () => {
        before('Key word before', () => db.collections()
                .then((result) => {
                    const target_collections = result.map(collection => collection.collectionName);

                    if (target_collections.indexOf("search_by_company_keywords") === -1 &&
                        target_collections.indexOf("earch_by_job_title_keywords") === -1
                    ) {
                        return Promise.all([
                            create_company_keyword_collection(db),
                            create_title_keyword_collection(db),
                        ]);
                    }

                    if (target_collections.indexOf("search_by_company_keywords") === -1) {
                        return create_company_keyword_collection(db);
                    }
                    if (target_collections.indexOf("earch_by_job_title_keywords") === -1) {
                        return create_title_keyword_collection(db);
                    }
                }));

        before('Seeding some experiences', () => {
            const inter_data_1 = Object.assign(generateInterviewExperienceData(), {
                company: {
                    name: "GOODJOB1",
                    id: "123",
                },
                job_title: "SW ENGINEER",
                created_at: new Date("2017-03-20T10:00:00.929Z"),
                like_count: 10,
            });

            const inter_data_2 = Object.assign(generateInterviewExperienceData(), {
                company: {
                    name: "BADJOB",
                    id: "321",
                },
                job_title: "HW ENGINEER",
                created_at: new Date("2017-03-22T10:00:00.929Z"),
                like_count: 5,
            });

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

            return db.collection('experiences').insertMany([
                inter_data_1,
                work_data_1,
                inter_data_2,
                work_data_2,
            ]);
        });

        it('應該回傳"全部"的資料，當沒有 query', () => request(app).get('/experiences')
                .expect(200)
                .expect((res) => {
                    assert.propertyVal(res.body, 'total', 4);
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 4);
                }));

        it(`搜尋 company 正確`, () => request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB2",
                    search_by: "company",
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'GOODJOB2', id: '456' });
                    assert.propertyVal(res.body.experiences[0], 'job_title', 'ENGINEER');
                }));

        it('搜尋 job_title 正確', () => request(app).get('/experiences')
                .query({
                    search_query: "HW ENGINEER",
                    search_by: "job_title",
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'BADJOB', id: '321' });
                    assert.propertyVal(res.body.experiences[0], 'job_title', 'HW ENGINEER');
                }));

        it('搜尋 company, 小寫 search_query 轉換成大寫', () => request(app).get('/experiences')
                .query({
                    search_query: "GoodJob1",
                    search_by: "company",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 2);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'GOODJOB1', id: '123' });
                }));

        it('搜尋 company, match any substring in company.name', () => request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB",
                    search_by: "company",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 3);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'GOODJOB1', id: '123' });
                    assert.deepEqual(res.body.experiences[1].company, { name: 'GOODJOB2', id: '456' });
                    assert.deepEqual(res.body.experiences[2].company, { name: 'GOODJOB1', id: '123' });
                }));

        it('依照 sort (created_at) 排序', () => request(app).get('/experiences')
                .query({
                    sort: 'created_at',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 4);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'GOODJOB1', id: '123' }); // 2017-03-25T10:00:00.929Z
                    assert.deepEqual(res.body.experiences[1].company, { name: 'BADJOB', id: '321' }); // 2017-03-22T10:00:00.929Z
                    assert.deepEqual(res.body.experiences[2].company, { name: 'GOODJOB2', id: '456' }); // 2017-03-21T10:00:00.929Z
                    assert.deepEqual(res.body.experiences[3].company, { name: 'GOODJOB1', id: '123' }); // 2017-03-20T10:00:00.929Z
                }));

        it('搜尋 company, 根據統編搜尋', () => request(app).get('/experiences')
                .query({
                    search_query: "123",
                    search_by: "company",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 2);
                    assert.deepEqual(res.body.experiences[0].company, { name: 'GOODJOB1', id: '123' });
                    assert.deepEqual(res.body.experiences[1].company, { name: 'GOODJOB1', id: '123' });
                }));

        it('should be status 422 當 search_by 不符合規定之種類', () => request(app).get('/experiences')
                .query({
                    search_query: "321",
                    search_by: "xxxxx",
                })
                .expect(422));

        it('should be status 422 當 sort 不符合規定之種類', () => request(app).get('/experiences')
                .query({
                    sort: "xxxxx",
                })
                .expect(422));

        it('驗證『面試經驗』回傳欄位', () => request(app).get('/experiences')
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'total');
                    assert.property(res.body, 'experiences');
                    const experience = res.body.experiences[3];
                    assert.property(experience, '_id');
                    assert.propertyVal(experience, 'type', 'interview');
                    assert.property(experience, 'created_at');
                    assert.property(experience, 'company');
                    assert.property(experience, 'job_title');
                    assert.property(experience, 'title');
                    assert.property(experience, 'preview');
                    assert.property(experience, 'like_count');
                    assert.property(experience, 'reply_count');

                    assert.notProperty(experience, 'author_id');
                    assert.notProperty(experience, 'overall_rating');
                    assert.notProperty(experience, 'sections');
                    assert.notProperty(experience, 'experience_in_year');
                    assert.notProperty(experience, 'education');
                    assert.notProperty(experience, 'interview_time');
                    assert.notProperty(experience, 'interview_qas');
                    assert.notProperty(experience, 'interview_result');
                    assert.notProperty(experience, 'interview_sensitive_questions');
                }));

        it('驗證『工作經驗』回傳欄位', () => request(app).get('/experiences')
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'total');
                    assert.property(res.body, 'experiences');
                    const experience = res.body.experiences[2];
                    assert.property(experience, '_id');
                    assert.propertyVal(experience, 'type', 'work');
                    assert.property(experience, 'created_at');
                    assert.property(experience, 'company');
                    assert.property(experience, 'region');
                    assert.property(experience, 'job_title');
                    assert.property(experience, 'title');
                    assert.property(experience, 'preview');
                    assert.property(experience, 'salary');
                    assert.property(experience, 'week_work_time');
                    assert.property(experience, 'like_count');
                    assert.property(experience, 'reply_count');

                    assert.notProperty(experience, 'author_id');
                    assert.notProperty(experience, 'sections');
                    assert.notProperty(experience, 'experience_in_year');
                    assert.notProperty(experience, 'education');
                    assert.notProperty(experience, 'recommend_to_others');
                    assert.notProperty(experience, 'is_currently_employed');
                    assert.notProperty(experience, 'job_ending_time');
                    assert.notProperty(experience, 'data_time');
                }));

        it('type = "interview" 正確取得 面試經驗', () => request(app).get('/experiences')
                .query({
                    type: "interview",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 2);
                    assert.propertyVal(res.body.experiences[0], 'type', 'interview');
                }));

        it('type = "work" 正確取得 工作經驗', () => request(app).get('/experiences')
                .query({
                    type: "work",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 2);
                    assert.propertyVal(res.body.experiences[0], 'type', 'work');
                }));

        it('搜尋 company 與 type = "interview" (search_query = "GoodJob1", search_by = "company")，預期回傳 1 筆資料', () => request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB1",
                    search_by: "company",
                    type: "interview",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 1);
                    assert.propertyVal(res.body.experiences[0], 'like_count', 10, '驗證是特定一筆');
                }));

        it('should be status 422 當給定 search_query 卻沒有 search_by', () => request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB1",
                })
                .expect(422));

        it('type 聯合查詢 type = "work,interview" 正確取得 面試/工作經驗', () => request(app).get('/experiences')
                .query({
                    type: "work,interview",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 4);
                }));

        it('search_by="company" type="interview" ，預期回傳2筆資料', () => request(app).get('/experiences')
                .query({
                    type: "interview",
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body.experiences, 2);
                }));

        it('limit = 3, start = 0，預期回傳 3 筆資料', () => request(app).get('/experiences')
                .query({
                    limit: 3,
                    start: 0,
                })
                .expect(200)
                .expect((res) => {
                    assert.propertyVal(res.body, 'total', 4, 'total 應該要是全部資料的數量');
                    assert.lengthOf(res.body.experiences, 3);
                }));

        it('should be status 422 if limit = 0', () => request(app).get('/experiences')
                .query({
                    limit: 0,
                })
                .expect(422));

        it('should be status 422 if limit < 0', () => request(app).get('/experiences')
                .query({
                    limit: -1,
                })
                .expect(422));

        it('should be status 422 if limit > 100', () => request(app).get('/experiences')
                .query({
                    limit: 101,
                })
                .expect(422));

        it('should be status 422 if start < 0', () => request(app).get('/experiences')
                .query({
                    start: -1,
                })
                .expect(422));

        it('依照 sort (popularity) 排序，回傳的經驗根據 like_count 數值由大到小排列', () => request(app).get('/experiences')
                .query({
                    sort: 'popularity',
                })
                .expect(200)
                .expect((res) => {
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 4);
                    assert.propertyVal(res.body.experiences[0], 'like_count', 10);
                    assert.propertyVal(res.body.experiences[1], 'like_count', 9);
                    assert.propertyVal(res.body.experiences[2], 'like_count', 5);
                    assert.propertyVal(res.body.experiences[3], 'like_count', 0);
                }));

        after(() => db.collection('experiences').deleteMany({}));

        after(() => Promise.all([
            db.collection('company_keywords').drop(),
            db.collection('job_title_keywords').drop(),
        ]).then(() => Promise.all([
            create_title_keyword_collection(db),
            create_company_keyword_collection(db),
        ])));
    });
});
