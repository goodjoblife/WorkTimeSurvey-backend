//const chai = require('chai');
//const assert = chai.assert;
const request = require('supertest');
const app = require('../../../app');
const MongoClient = require('mongodb').MongoClient;

describe('experiences 面試和工作經驗資訊', function() {
    let db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });


    describe('POST /interview_experiences', function() {
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

        describe('generate payload', function() {
            it('generateInterViewExperiencePayload', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload())
                    .expect(200)
                    .end(done);
            });
        });

        describe('Common Data Validation Part', function() {
            it('company or company_id is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        company: -1,
                        company_id: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('area is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        area: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('job_title is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        job_title: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('title is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        title: -1,
                    }))
                    .expect(422)
                    .end(done);
            });
        });

        describe('Interview Validation Part', function() {
            it('interview_time_year is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_time_year: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('interview_time_month is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_time_month: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            describe('interview_time should be reasonable', function() {
                it('interview_time_year sould be number', function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_year: "a",
                        }))
                        .expect(422)
                        .end(done);
                });

                it('interview_time_month sould be number', function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_year: "a",
                        }))
                        .expect(422)
                        .end(done);
                });

                it('interview_time_year <= this year', function(done) {
                    let nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_year: nextYear.getFullYear().toString(),
                        }))
                        .expect(422)
                        .end(done);
                });

                it('interview_time_year > this year - 10', function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_year: ((new Date()).getFullYear() - 10).toString(),
                        }))
                        .expect(422)
                        .end(done);
                });

                it('interview_time_month should be 1~12', function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_month: "13",
                        }))
                        .expect(422)
                        .end(done);
                });

                it('interview_time <= now', function(done) {
                    let now = new Date();

                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_time_year: now.getFullYear().toString(),
                            interview_time_month: (now.getMonth() + 2).toString(),
                        }))
                        .expect(422)
                        .end(done);
                });
            });

            it('interview_result is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_result: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it.skip('interview_result could not be others', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        interview_result: "invalid",
                    }))
                    .expect(422)
                    .end(done);
            });

            for (let result of [""]) {
                it.skip(`interview_result should be ${result}`, function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            interview_result: result,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            // todo
                        })
                        .end(done);
                });
            }

            it('overall_rating is required', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        overall_rating: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('overall_rating should be 1~5', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        overall_rating: "6",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('experience_in_year should not be a valid number', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        experience_in_year: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('experience_in_year should be 0~50', function(done) {
                request(app).post('/interview_experiences')
                    .send(generateInterviewExperiencePayload({
                        experience_in_year: "51",
                    }))
                    .expect(422)
                    .end(done);
            });

            for (let input of [""]) {
                it.skip(`education should be ${input}`, function(done) {
                    request(app).post('/interview_experiences')
                        .send(generateInterviewExperiencePayload({
                            education: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            // todo
                        })
                        .end(done);
                });
            }
        });

        after('DB: 清除 experiences', function() {
            return db.collection('experiences').remove({});
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });
    });
});

function generateInterviewExperiencePayload(opt) {
    opt = opt || {};
    const valid = {
        author_type: "facebook",
        author_id: "id123",
        company_id: '00000001',
        area: "Taipei",
        job_title: 'job_title_example',
        title: "title_example",
        sections: [
            {
                subtitle: "subtitle1",
                content: "content1",
            },
        ],
        experience_in_year: '10',
        education: "BS",
        // Interview Experience related
        interview_time_year: "2017",
        interview_time_month: "3",
        interview_qas: [
            {
                question: "qas1",
                answer: "ans1",
            },
        ],
        interview_result: "up",
        salary_type: 'year',
        salary_amount: '10000',
        overall_rating: "5",
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

    return payload;
}
