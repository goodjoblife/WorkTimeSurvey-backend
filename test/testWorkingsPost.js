const chai = require('chai');
const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const nock = require('nock');

describe('Workings 工時資訊', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    describe('POST /workings', function() {
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

        beforeEach('Mock the request to FB', function() {
            nock('https://graph.facebook.com:443')
                .get('/v2.6/me')
                .query(true)
                .reply(200, {id: '-1', name: 'test'});
        });

        describe('Authentication & Authorization Part', function () {
            it('需要回傳 401 如果沒有 access_token', function(done) {
                request(app).post('/workings')
                    .expect(401)
                    .end(done);
            });

            it('需要回傳 401 如果 access_token 為空', function(done) {
                request(app).post('/workings')
                    .send({
                        access_token: "",
                    })
                    .expect(401)
                    .end(done);
            });

            it('需要回傳 401 如果不能 FB 登入', function(done) {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .query(true)
                    .reply(200, {error: 'error'});

                request(app).post('/workings')
                    .send({
                        access_token: 'random',
                    })
                    .expect(401)
                    .end(done);
            });
        });

        describe('generate payload', function() {
            it('generateWorkingTimeRelatedPayload', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload())
                    .expect(200)
                    .end(done);
            });

            it('generateSalaryRelatedPayload', function(done) {
                request(app).post('/workings')
                    .send(generateSalaryRelatedPayload())
                    .expect(200)
                    .end(done);
            });
        });

        describe('Common Data Validation Part', function() {
            it('job_title is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('company or company_id is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company: -1,
                        company_id: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('sector can be inserted', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        //company_id: '00000001',
                        sector: 'Hello world',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body.working, 'sector', 'Hello world');
                    })
                    .end(done);
            });
        });

        describe('WorkingTime Validation Part', function() {
            it('week_work_time is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('week_work_time should be a number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('week_work_time should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "186",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('week_work_time can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "30.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.week_work_time', 30.5);
                    })
                    .end(done);
            });

            it('overtime_frequency is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('overtime_frequency should in [0, 1, 2, 3]', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: '5',
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_promised_work_time is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_promised_work_time should be a number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_promised_work_time should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "25",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_promised_work_time can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_promised_work_time', 3.5);
                    })
                    .end(done);
            });

            it('day_real_work_time is required', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_real_work_time should be a number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_real_work_time should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "25",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('day_real_work_time can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_real_work_time', 3.5);
                    })
                    .end(done);
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('has_overtime_salary should be ' + input, function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'has_overtime_salary', input);
                        })
                        .end(done);
                });
            }
            for (let input of ['', undefined]) {
                it('has_overtime_salary wouldn\'t be returned if it is "' + input + '"', function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'has_overtime_salary');
                        })
                        .end(done);
                });
            }

            it('has_overtime_salary wouldn\'t be returned if there is no such field in payload', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'has_overtime_salary');
                    })
                    .end(done);
            });

            it('has_overtime_salary should be error if request others', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: '-1',
                    }))
                    .expect(422)
                    .end(done);
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('is_overtime_salary_legal should be ' + input, function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'is_overtime_salary_legal', input);
                        })
                        .end(done);
                });
            }
            for (let preInput of ['no', 'don\'t know', '-1', '', undefined]) {
                it('is_overtime_salary_legal should be error if has_overtime_salary is not yes', function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: preInput,
                            is_overtime_salary_legal: 'yes',
                        }))
                        .expect(422)
                        .end(done);
                });
            }

            for (let input of ['', undefined]) {
                it('is_overtime_salary_legal wouldn\'t be returned if it is "' + input + '"', function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                        })
                        .end(done);
                });
            }

            it('is_overtime_salary_legal wouldn\'t be returned if there is no such field in payload', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                    })
                    .end(done);
            });

            it('is_overtime_salary_legal should be error if request others', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: 'yes',
                        is_overtime_salary_legal: '-1',
                    }))
                    .expect(422)
                    .end(done);
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('has_compensatory_dayoff should be ' + input, function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'has_compensatory_dayoff', input);
                        })
                        .end(done);
                });
            }
            for (let input of ['', undefined]) {
                it('has_compensatory_dayoff wouldn\'t be returned if it is "' + input + '"', function(done) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                        })
                        .end(done);
                });
            }

            it('has_compensatory_dayoff wouldn\'t be returned if there is no such field in payload', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                    })
                    .end(done);
            });

            it('has_compensatory_dayoff should be error if request others', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_compensatory_dayoff: '-1',
                    }))
                    .expect(422)
                    .end(done);
            });
        });

        describe('Normalize Data Part', function() {
            it('job_title will be converted to UPPERCASE', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: 'GoodJob',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body.working, 'job_title', 'GOODJOB');
                    })
                    .end(done);
            });

            it('company 只給 company_id 成功新增', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000001',
                        company: -1,
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    })
                    .end(done);
            });

            it('company 禁止錯誤的 company_id', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000000',
                        company: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('company 只給 company 成功新增', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GOODJOB',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    })
                    .end(done);
            });

            it('company 是小寫時，轉換成大寫', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJob',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    })
                    .end(done);
            });

            it('只給 company，但名稱無法決定唯一公司，成功新增', function(done) {
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJobGreat',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.isUndefined(res.body.working.company.id);
                        assert.equal(res.body.working.company.name, 'GOODJOBGREAT');
                    })
                    .end(done);
            });
        });

        describe('Quota Check Part', function() {
            it('只能新增 5 筆資料', function(done) {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .times(6)
                    .query(true)
                    .reply(200, {id: '-1', name: 'test'});

                const count = 5;

                var requestPromiseStack = [];
                for (let i = 0; i < count; i++) {
                    requestPromiseStack.push(new Promise(function(resolve, reject) {
                        request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                company_id: '00000001',
                            }))
                            .expect(200)
                            .expect(function(res) {
                                assert.equal(res.body.working.company.id, '00000001');
                                assert.equal(res.body.working.company.name, 'GOODJOB');
                            })
                            .end(function(err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                    }));
                }

                Promise.all(requestPromiseStack).then(function() {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            company_id: '00000001',
                        }))
                        .expect(429)
                        .end(done);
                }).catch(function(err) {
                    done(err);
                });
            });

            it('新增 2 筆資料，quries_count 會顯示 2', function(done) {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .times(2)
                    .query(true)
                    .reply(200, {id: '-1', name: 'test'});

                (new Promise(function(resolve, reject) {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            company_id: '00000001',
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.equal(res.body.queries_count, 1);
                            assert.equal(res.body.working.company.id, '00000001');
                            assert.equal(res.body.working.company.name, 'GOODJOB');
                        })
                        .end(function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                })).then(function() {
                    request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            company_id: '00000001',
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.equal(res.body.queries_count, 2);
                            assert.equal(res.body.working.company.id, '00000001');
                            assert.equal(res.body.working.company.name, 'GOODJOB');
                        })
                        .end(done);
                }).catch(function(err) {
                    done(err);
                });
            });
        });

        afterEach(function() {
            nock.cleanAll();
        });

        afterEach(function() {
            return db.collection('authors').remove({});
        });

        after('DB: 清除 workings', function() {
            return db.collection('workings').remove({});
        });

        after('DB: 清除 companies', function() {
            return db.collection('companies').remove({});
        });
    });
});

function generateWorkingTimeRelatedPayload(opt) {
    opt = opt || {};
    const valid = {
        access_token: 'random',
        job_title: 'test',
        company_id: '00000001',
        is_currently_employed: 'yes',
        employment_type: 'full-time',
        week_work_time: '40',
        overtime_frequency: '3',
        day_promised_work_time: '8',
        day_real_work_time: '10',
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

function generateSalaryRelatedPayload(opt) {
    opt = opt || {};
    const valid = {
        access_token: 'random',
        job_title: 'test',
        company_id: '00000001',
        is_currently_employed: 'yes',
        employment_type: 'full-time',
        salary_type: 'year',
        salary_amount: '10000',
        experience_in_year: '10',
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

