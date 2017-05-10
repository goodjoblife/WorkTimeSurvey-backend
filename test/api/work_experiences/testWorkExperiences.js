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
    let fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'markLin',
        },
    };

    before('DB: Setup', function() {
        return MongoClient.connect(config.get('MONGODB_URI')).then(function(_db) {
            db = _db;
        });
    });

    describe('POST /work_experiences', function() {
        let sandbox;
        before('Seed companies', function() {
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

        beforeEach('Stub cachedFacebookAuthentication', function() {
            sandbox = sinon.sandbox.create();
            sandbox.stub(authentication, 'cachedFacebookAuthentication')
                .withArgs(sinon.match.object, sinon.match.object, 'fakeaccesstoken')
                .resolves(fake_user);
        });

        describe('generate payload', function() {
            it('generateWorkExperiencePayload', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload())
                    .expect(200)
                    .then(res => {
                        return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                // expected fields in db
                                assert.equal(experience.type, 'work');
                                assert.deepEqual(experience.author, {id: '-1', type: 'facebook'});
                                assert.deepEqual(experience.company, {id: '00000001', name: 'GOODJOB'});
                                assert.equal(experience.region, '臺北市');
                                assert.equal(experience.job_title, 'JOB_TITLE_EXAMPLE');
                                assert.equal(experience.title, 'title_example');
                                assert.deepEqual(experience.sections, [{subtitle: "subtitle1", content: "content1"}]);
                                assert.equal(experience.experience_in_year, 10);
                                assert.equal(experience.education, '大學');
                                assert.equal(experience.is_currently_employed, "no");
                                assert.deepEqual(experience.job_ending_time, {year: 2017, month: 4});
                                assert.deepEqual(experience.salary, {type: 'year', amount: 10000});
                                assert.equal(experience.week_work_time, 40);
                                assert.equal(experience.recommend_to_others, "yes");
                                assert.deepEqual(experience.like_count, 0);
                                assert.deepEqual(experience.reply_count, 0);
                                assert.property(experience, 'created_at');
                                assert.property(experience, 'data_time');

                                // expected response
                                assert.property(res.body, 'success');
                                assert.equal(res.body.success, true);
                                assert.deepProperty(res.body, 'experience._id');
                            });
                    });
            });
        });

        describe('Common Data Validation Part', function() {
            it('company_query or company_id is required', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        company_query: -1,
                        company_id: -1,
                    }))
                    .expect(422);
            });

            it('region is required', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        region: -1,
                    }))
                    .expect(422);
            });

            it('region is illegal Field, expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        region: "你好市",
                    }))
                    .expect(422);
            });

            for (let input of ["新北市", "臺南市", "新竹市"]) {
                it(`region should be ${input}`, function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            region: input,
                        }))
                        .expect(200)
                        .then(res => {
                            return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                assert.equal(experience.region, input);
                            });
                        });
                });
            }

            it('job_title is required', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        job_title: -1,
                    }))
                    .expect(422);
            });

            it('title is required', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        title: -1,
                    }))
                    .expect(422);
            });

            it('title of word is more than 25 char , expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        title: new Array(30).join("今"),
                    }))
                    .expect(422);
            });

            it('sections is empty, expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        sections: null,
                    }))
                    .expect(422);
            });

            it('sections is not array, expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        sections: "abcdef",
                    }))
                    .expect(422);
            });

            it('subsection of title and content is empty, expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({ sections: [{subtitle: null, content: null}] }))
                    .expect(422);
            });

            it('subtitle of word is more than 25 char, expected return 422', function() {
                const words = new Array(40).join("慘");
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({ sections: [{subtitle: words, content: "喝喝面試官"}] }))
                    .expect(422);
            });

            it('subcontent of word is more then 5000 char, expected return 422', function() {
                const sendData = generateWorkExperiencePayload();
                const words = new Array(6000).join("好");
                sendData.sections[0].content = words;
                return request(app).post('/work_experiences')
                    .send(sendData)
                    .expect(422);
            });

            it('experience_in_year should not be a valid number', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        experience_in_year: "test",
                    }))
                    .expect(422);
            });

            it('experience_in_year should be 0~50', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        experience_in_year: 51,
                    }))
                    .expect(422);
            });

            it('education is illegal , expected return 422', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        education: "無業遊名",
                    }))
                    .expect(422);
            });

            for (let input of ["大學", "高中", "國中"]) {
                it(`education could be ${input}`, function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            education: input,
                        }))
                        .expect(200)
                        .then(res => {
                            return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                assert.equal(experience.education, input);
                            });
                        });
                });
            }
        });

        describe('Work Validation Part', function() {
            it('is_currently_employed is required', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        is_currently_employed: -1,
                    }))
                    .expect(422);
            });

            it('job_ending_time is required if is_currently_employed is "no"', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        is_currently_employed: "no",
                        job_ending_time: -1,
                    }))
                    .expect(422);
            });

            describe('job_ending_time should be reasonable', function() {
                it('job_ending_time.year sould be number', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: "2017",
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('job_ending_time.month sould be number', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: 2017,
                                month: "3",
                            },
                        }))
                        .expect(422);
                });

                it('job_ending_time.year <= this year', function() {
                    const nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: nextYear.getFullYear(),
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('job_ending_time.year > this year - 10', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: ((new Date()).getFullYear() - 10),
                                month: 3,
                            },
                        }))
                        .expect(422);
                });

                it('job_ending_time.month should be 1~12', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: 2017,
                                month: 13,
                            },
                        }))
                        .expect(422);
                });

                it('job_ending_time <= now', function() {
                    const now = new Date();

                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            job_ending_time: {
                                year: now.getFullYear(),
                                month: now.getMonth() + 2,
                            },
                        }))
                        .expect(422);
                });
            });

            describe('salary should be reasonable', function() {
                it('salary type should in ["year","month","day","hour"]', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            salary: {
                                type: "hooooo",
                                amount: 10000,
                            },
                        }))
                        .expect(422);
                });

                it('salary amount is number required', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            salary: {
                                type: "year",
                                amount: "hohohoho",
                            },
                        }))
                        .expect(422);
                });

                it('salary amount should be positive number', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            salary: {
                                type: "year",
                                amount: -1000,
                            },
                        }))
                        .expect(422);
                });
            });

            it('week_work_time should be number', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        week_work_time: "one",
                    }))
                    .expect(422);
            });

            it('week_work_time should be positive number', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        week_work_time: -10,
                    }))
                    .expect(422);
            });

            it('recommend_to_others should be ["yes", "no", "don\'t know"]', function() {
                return request(app).post('/work_experiences')
                    .send(generateWorkExperiencePayload({
                        recommend_to_others: "yeah",
                    }))
                    .expect(422);
            });

            describe('data_time should be reasonable', function() {
                it('data_time\'s year & month should be today if is_currently_employed is "yes"', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            is_currently_employed: "yes",
                        }))
                        .expect(200)
                        .then(res => {
                            return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                const now = new Date();
                                assert.deepEqual(experience.data_time, {
                                    year: now.getFullYear(),
                                    month: now.getMonth() + 1,
                                });
                            });
                        });
                });

                it('data_time should be job_ending_time if is_currently_employed is "no"', function() {
                    return request(app).post('/work_experiences')
                        .send(generateWorkExperiencePayload({
                            is_currently_employed: "no",
                            job_ending_time: {
                                year: 2017,
                                month: 4,
                            },
                        }))
                        .expect(200)
                        .then(res => {
                            return db.collection('experiences').findOne({_id: ObjectId(res.body.experience._id)})
                            .then(experience => {
                                assert.deepEqual(experience.data_time, {
                                    year: 2017,
                                    month: 4,
                                });
                            });
                        });
                });
            });
        });

        describe('user not login', function() {
            it('should return 401 Unauthorized', function() {
                const sendData = generateWorkExperiencePayload();
                sendData.access_token = undefined;
                return request(app).post('/work_experiences')
                    .send(sendData)
                    .expect(401);
            });
        });

        after('DB: 清除 experiences', function() {
            return db.collection('experiences').remove({});
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });

        afterEach(function() {
            sandbox.restore();
        });
    });
});

function generateWorkExperiencePayload(opt) {
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
        // Work Experience related
        is_currently_employed: "no",
        job_ending_time: {
            year: 2017,
            month: 4,
        },
        salary: {
            type: 'year',
            amount: 10000,
        },
        week_work_time: 40,
        recommend_to_others: "yes",
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
