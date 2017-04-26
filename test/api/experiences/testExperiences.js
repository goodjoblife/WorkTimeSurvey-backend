const chai = require('chai');
chai.use(require('chai-datetime'));
const assert = chai.assert;
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;
const config = require('config');

describe('Experiences 面試和工作經驗資訊', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });
    describe('GET /experiences/:id', function() {

        let testId = undefined;

        before('Creating experiences', function() {
            return db.collection('experiences').insertOne({
                type: "interview",
                created_at: new Date("2017-03-20T10:00:00.929Z"),
                author: {
                    type: "facebook",
                    _id: "123",
                },
                company: {
                    id: "abcde01",
                    name: "GoodJob",
                },
                area: "台北",
                job_title: "Junior backend engineer",
                interview_time_year: "2017",
                interview_time_month: "3",
                title: "XXX面試洗臉記",
                sections: [{
                    subtitle: "人資的問話",
                    content: "人資妹子好啊",
                }, {
                    subtitle: "被洗臉了",
                    content: "被洗到好慘",
                }],
                education: "碩士",
                interview_time: {
                    year: 10,
                    month: 1,
                },
                interview_qas: [
                    { question: "What your name?", answer: "I'm Mark" },
                ],
                interview_result: "Sorry ~ ",
                interview_sensitive_questions: [
                    "Are you a yacht boy ?",
                ],
                salary: {
                    type: "year",
                    amount: 1000000,
                },
                status: "draft",
                like_count: 1,
                reply_count: 1,
            }).then(function(result) {
                testId = result.ops[0]._id;
            });
        });

        it(' Expected get one data', function() {
            return request(app).get("/experiences/" + testId)
                .expect(200)
                .expect(function(res) {
                    assert.equal(res.body._id, testId);
                    assert.notDeepProperty(res.body, 'author');
                });
        });
        it('Set error uri and expected to get error', function() {
            return request(app).get("/experiences/123XXX")
                .expect(404);
        });
        after(function() {
            return db.collection('experiences').remove({});
        });
    });
    describe('GET /experiences', function() {

        before('Seeding some experiences', function() {
            return db.collection('experiences').insertMany([
                {
                    type: "interview",
                    created_at: new Date("2017-03-20T10:00:00.929Z"),
                    company: {
                        name: "GOODJOB1",
                        id: "123",
                    },
                    area: "台北",
                    title: "Good面試",
                    job_title: "SW ENGINEER",
                    overall_rating: "5",
                    sections: [
                        {
                            subtitle: "面試過程",
                            content: "很開心",
                        },
                    ],
                    interview_time: {
                        year: 10,
                        month: 1,
                    },
                    interview_qas: [
                        { question: "What your name?", answer: "I'm Mark" },
                    ],
                    interview_result: "Sorry ~ ",
                    interview_sensitive_questions: [
                        "Are you a yacht boy ?",
                    ],
                    salary: {
                        type: "year",
                        amount: 1000000,
                    },
                    experience_in_year: "1",
                    education: "bachelor",
                    salary_type: "month",
                    salary_amount: "66666",
                    like_count: 1,
                    reply_count: 1,
                },
                {
                    type: "work",
                    author: {
                        type: "facebook",
                        _id: "abcde",
                    },
                    created_at: new Date("2017-03-21T10:00:00.929Z"),
                    company: {
                        name: "GOODJOB2",
                        id: "123",
                    },
                    region: "台北",
                    job_title: "ENGINEER",
                    title: "Facebook Work",
                    sections: [
                        {
                            subtitle: "面試過程",
                            content: "很開心",
                        },
                    ],
                    experience_in_year: "1",
                    education: "bachelor",
                    is_currently_employed: "yes",
                    job_ending_time: {
                        year: 2017,
                        month: 1,
                    },
                    salary: {
                        type: "month",
                        amount: 100000,
                    },
                    week_work_time: 40,
                    recommend_to_others: "yes",
                    data_time: {
                        year: 2017,
                        month: 1,
                    },
                    like_count: 1,
                    reply_count: 1,
                },
                {
                    created_at: new Date("2017-03-22T10:00:00.929Z"),
                    company: {
                        name: "BADJOB",
                        id: "321",
                    },
                    area: "台北",
                    job_title: "HW ENGINEER",
                    interview_time_year: "2017",
                    interview_time_month: "3",
                    // interview_result: ???,
                    overall_rating: "5",
                    sections: [
                        {
                            subtitle: "面試過程",
                            content: "很開心",
                        },
                    ],
                    experience_in_year: "1",
                    education: "bachelor",
                    salary_type: "month",
                    salary_amount: "77777",
                },
            ]);
        });

        it(`check API return correct data without query`, function() {

            return request(app).get('/experiences')
                .query({})
                .expect(200)
                .expect(function(res) {
                    assert.propertyVal(res.body, 'total_pages', 1);
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 3);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'BADJOB');
                });
        });

        it(`return correct data if query company`, function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB2",
                    search_by: "company",
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'GOODJOB2');
                    assert.propertyVal(res.body.experiences[0], 'job_title', 'ENGINEER');
                });
        });

        it(`return correct data if query job_title`, function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "HW ENGINEER",
                    search_by: "job_title",
                })
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'experiences');
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'BADJOB');
                    assert.propertyVal(res.body.experiences[0], 'job_title', 'HW ENGINEER');
                });
        });

        it('小寫 company query 轉換成大寫', function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "GoodJob1",
                    search_by: "company",
                })
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'GOODJOB1');
                });
        });

        it('company match any substring in company.name', function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "GOODJOB",
                    search_by: "company",
                })
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body.experiences, 2);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'GOODJOB2');
                    assert.deepPropertyVal(res.body.experiences[1], 'company.name', 'GOODJOB1');
                });
        });

        it('依照 sort_by  排序', function() {

            return request(app).get('/experiences')
                .query({
                    sort_by: 'created_at',
                })
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body.experiences, 3);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.name', 'BADJOB');
                    assert.deepPropertyVal(res.body.experiences[1], 'company.name', 'GOODJOB2');
                    assert.deepPropertyVal(res.body.experiences[2], 'company.name', 'GOODJOB1');
                });
        });

        it('根據統編搜尋', function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "321",
                    search_by: "company",
                })
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body.experiences, 1);
                    assert.deepPropertyVal(res.body.experiences[0], 'company.id', '321');
                });
        });

        it('search_by輸入不符合規定之種類，預期回傳error code 422', function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "321",
                    search_by: "xxxxx",
                })
                .expect(422);
        });

        it('sort輸入不符合規定之種類，預期回傳error code 422', function() {

            return request(app).get('/experiences')
                .query({
                    search_query: "321",
                    sort: "xxxxx",
                })
                .expect(422);
        });

        it('沒有query的搜尋，驗證『面試經驗』回傳欄位', function() {
            return request(app).get('/experiences')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'total_pages');
                    assert.property(res.body, 'page');
                    assert.property(res.body, 'experiences');
                    const experience = res.body.experiences[2];
                    assert.property(experience, '_id');
                    assert.propertyVal(experience, 'type', 'interview');
                    assert.property(experience, 'created_at');
                    assert.property(experience, 'company');
                    assert.property(experience, 'job_title');
                    assert.property(experience, 'title');
                    assert.property(experience, 'preview');
                    assert.property(experience, 'like_count');
                    assert.property(experience, 'reply_count');

                    assert.notProperty(experience, 'author');
                    assert.notProperty(experience, 'sections');
                    assert.notProperty(experience, 'experience_in_year');
                    assert.notProperty(experience, 'education');
                    assert.notProperty(experience, 'interview_time');
                    assert.notProperty(experience, 'interview_qas');
                    assert.notProperty(experience, 'interview_result');
                    assert.notProperty(experience, 'interview_sensitive_questions');
                });
        });

        it('沒有query的搜尋，驗證『工作經驗』回傳欄位', function() {
            return request(app).get('/experiences')
                .expect(200)
                .expect(function(res) {
                    assert.property(res.body, 'total_pages');
                    assert.property(res.body, 'page');
                    assert.property(res.body, 'experiences');
                    const experience = res.body.experiences[1];
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

                    assert.notProperty(experience, 'author');
                    assert.notProperty(experience, 'sections');
                    assert.notProperty(experience, 'experience_in_year');
                    assert.notProperty(experience, 'education');
                });
        });
        after(function() {
            return db.collection('experiences').remove({});
        });
    });
});
