const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');
const authentication = require('../../../libs/authentication');

describe('experiences 面試和工作經驗資訊', function() {
    let db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });


    describe('POST /interview_experiences', function() {
        let sandbox;
        before('Seed companies', function() {
            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, 'fakeaccesstoken')
                .resolves({
                    id: '-1',
                    name: 'markLin',
                });
            return db.collection('companies').insertMany([
                {
                    id: '00000001',
                    name: 'GOODJOB',
                },
                {
                    id: '00000002',
                    name: 'GOODJOBGREAT',
                },
                {
                    id: '00000003',
                    name: 'GOODJOBGREAT',
                },
            ]);
        });

        describe('generate payload', function() {
            it('generateInterViewExperiencePayload', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload())
                    .expect(200)
                    .then(res => {
                        return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                // expected fields in db
                                assert.equal(experience.type, 'interview');
                                assert.deepEqual(experience.author, {id: '-1', type: 'facebook'});
                                assert.deepEqual(experience.company, {id: '00000001', name: 'GOODJOB'});
                                assert.equal(experience.region, '臺北市');
                                assert.equal(experience.job_title, 'JOB_TITLE_EXAMPLE');
                                assert.equal(experience.title, 'title_example');
                                assert.deepEqual(experience.sections, [{subtitle: "subtitle1", content: "content1"}]);
                                assert.equal(experience.experience_in_year, 10);
                                assert.equal(experience.education, '大學');
                                assert.deepEqual(experience.interview_time, {year: 2017, month: 3});
                                assert.deepEqual(experience.interview_qas, [{question: "qas1", answer: "ans1"}]);
                                assert.deepEqual(experience.interview_result, 'up');
                                assert.deepEqual(experience.interview_sensitive_questions, []);
                                assert.deepEqual(experience.salary, {type: 'year', amount: 10000});
                                assert.deepEqual(experience.overall_rating, 5);
                                assert.deepEqual(experience.like_count, 0);
                                assert.deepEqual(experience.reply_count, 0);
                                assert.property(experience, 'created_at');
                            });
                    });
            });
        });

        describe('Common Data Validation Part', function() {
            it('company_query or company_id is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        company_query: -1,
                        company_id: -1,
                    }))
                    .expect(422);
            });

            it('region is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        region: -1,
                    }))
                    .expect(422);
            });

            it('job_title is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        job_title: -1,
                    }))
                    .expect(422);
            });

            it('title is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        title: -1,
                    }))
                    .expect(422);
            });

            it('Region is illegal Field, expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.region = "你好市";
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Title of word is more than 25 char , expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.title = "今今天天氣真是好今天天氣真是好今天天氣真是好天天氣真是好~喝喝喝喝喝~";
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Sections is empty, expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.sections = null;
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Sections is not array, expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.sections = "abcde";
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Subsection of title and content is empty, expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.sections[0].subtitle = null;
                sendData.sections[0].content = null;
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Subcontent of word is more then 5000 char, expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                const words = new Array(6000).join("好");
                sendData.sections[0].content = words;
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('Education is illegal , expected return 422', function() {
                let sendData = generateInterviewExperiencePayload();
                sendData.education = "無業遊名";
                return request(app).post('/interview_experiences')
                    .send(sendData)
                    .expect(422);
            });
        });

        describe('Interview Validation Part', function() {
            it('interview_time_year is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_time: {
                            month: 3,
                        },
                    }))
                    .expect(422);
            });

            it('interview_time_month is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_time: {
                            year: 2017,
                        },
                    }))
                    .expect(422);
            });

            describe('interview_time should be reasonable', function() {
                it('interview_time_year sould be number', function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: "2017",
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('interview_time_month sould be number', function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: 2017,
                                month: "3",
                            },
                        }))
                        .expect(422);
                });

                it('interview_time_year <= this year', function() {
                    let nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: nextYear.getFullYear().toString(),
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('interview_time_year > this year - 10', function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: ((new Date()).getFullYear() - 10).toString(),
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('interview_time_month should be 1~12', function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: 2017,
                                month: 13,
                            },
                        }))
                        .expect(422);
                });

                it('interview_time <= now', function() {
                    let now = new Date();

                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time: {
                                year: now.getFullYear().toString(),
                                month: (now.getMonth() + 2).toString(),
                            },
                        }))
                        .expect(422);
                });
            });

            it('interview_result is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_result: -1,
                    }))
                    .expect(422);
            });

            it.skip('interview_result could not be others', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_result: "invalid",
                    }))
                    .expect(422);
            });

            for (let result of [""]) {
                it.skip(`interview_result should be ${result}`, function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_result: result,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            // todo
                        });
                });
            }

            it('overall_rating is required', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        overall_rating: -1,
                    }))
                    .expect(422);
            });

            it('overall_rating should be 1~5', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        overall_rating: 6,
                    }))
                    .expect(422);
            });

            it('experience_in_year should not be a valid number', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        experience_in_year: "test",
                    }))
                    .expect(422);
            });

            it('experience_in_year should be 0~50', function() {
                return request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        experience_in_year: 51,
                    }))
                    .expect(422);
            });

            for (let input of [""]) {
                it.skip(`education should be ${input}`, function() {
                    return request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            education: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            // todo
                        });
                });
            }
        });

        after('DB: 清除 experiences', function() {
            return db.collection('experiences').remove({});
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });

        after(function() {
            sandbox.restore();
        });
    });
});

function generateInterviewExperiencePayload(opt) {
    opt = opt || {};
    const valid = {
        company_query: '00000001',
        region: "臺北市",
        job_title: 'job_title_example',
        title: "title_example",
        sections: [
            {
                subtitle: "subtitle1",
                content: "content1",
            },
        ],
        experience_in_year: 10,
        education: "大學",
        // Interview Experience related
        interview_time: {
            year: 2017,
            month: 3,
        },
        interview_qas: [
            {
                question: "qas1",
                answer: "ans1",
            },
        ],
        interview_result: "up",
        salary: {
            type: 'year',
            amount: 10000,
        },
        overall_rating: 5,
    };

    var payload = {};
    for (let key in valid) {
        if (opt[key]) {
            if (opt[key] === -1) {
                continue;
            } else {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (let key in opt) {
        if (opt[key] === -1) {
            continue;
        } else {
            payload[key] = opt[key];
        }
    }
    payload["access_token"] = "fakeaccesstoken";
    return payload;
}
