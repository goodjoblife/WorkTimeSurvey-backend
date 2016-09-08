const chai = require('chai');
chai.use(require('chai-datetime'));
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

    describe('GET /workings/latest', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    created_at: new Date(),
                },
                {
                    created_at: new Date(),
                },
                {
                    created_at: new Date(),
                },
                {
                    created_at: new Date(),
                },
            ]);
        });

        it('return the pagination', function(done) {
            request(app).get('/workings/latest')
                .expect(200)
                .expect(function(res) {
                    assert.propertyVal(res.body, 'total', 4);
                    assert.property(res.body, 'workings');
                    assert.lengthOf(res.body.workings, 4);
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
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

        describe('access_token', function () {
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

        describe('job_title (職稱)', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        job_title: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('will be converted to UPPERCASE', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        company_id: '00000001',
                        job_title: 'GoodJob',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body.working, 'job_title', 'GOODJOB');
                    })
                    .end(done);
            });
        });

        describe('week_work_time (最近一週實際工時)', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        week_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        week_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        week_work_time: "186",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        week_work_time: "30.5",
                        company_id: '00000001',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.week_work_time', 30.5);
                    })
                    .end(done);
            });
        });

        describe('overtime_frequency 加班頻率', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        overtime_frequency: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should in [0, 1, 2, 3]', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        overtime_frequency: '5',
                    }))
                    .expect(422)
                    .end(done);
            });
        });

        describe('day_promised_work_time', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_promised_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_promised_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_promised_work_time: "25",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_promised_work_time: "3.5",
                        company_id: '00000001',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_promised_work_time', 3.5);
                    })
                    .end(done);
            });
        });
        
        describe('day_real_work_time', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_real_work_time: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_real_work_time: "test",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('should be a valid number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_real_work_time: "25",
                    }))
                    .expect(422)
                    .end(done);
            });

            it('can be a floating number', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        day_real_work_time: "3.5",
                        company_id: '00000001',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_real_work_time', 3.5);
                    })
                    .end(done);
            });
        });
        
        describe('company (公司/單位名稱)', function() {
            it('is required', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        company: -1,
                        company_id: -1,
                    }))
                    .expect(422)
                    .end(done);
            });
        });

        describe('company', function() {
            it('只給 company_id 成功新增', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
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
        
            it('禁止錯誤的 company_id', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
                        company_id: '00000000',
                        company: -1,
                    }))
                    .expect(422)
                    .end(done);
            });

            it('只給 company 成功新增', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
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

            it('當 company 是小寫時，轉換成大寫', function(done) {
                request(app).post('/workings')
                    .send(generatePayload({
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
                    .send(generatePayload({
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
                            .send(generatePayload({
                                company_id: '00000001',
                                company: -1,
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
                        .send(generatePayload({
                            company_id: '00000001',
                            company: -1,
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
                        .send(generatePayload({
                            company_id: '00000001',
                            company: -1,
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
                        .send(generatePayload({
                            company_id: '00000001',
                            company: -1,
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

    describe('GET /statistics/by-company', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 10,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 20,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB2',
                    week_work_time: 20,
                },
                {
                    company: {
                        name: 'YOUR GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 25,
                },
                {
                    company: {
                        name: 'OTHER BADJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 40,
                },
            ]);
        });

        it('error 422 if no company provided', function(done) {
            request(app).get('/workings/statistics/by-company')
                .expect(422)
                .end(done);
        });

        it('依照 company, job_title 來分群資料，結構正確', function(done) {
            request(app).get('/workings/statistics/by-company')
                .query({company: 'MY GOODJOB COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id.name');
                    assert.deepProperty(res.body, '0.job_titles');
                    assert.isArray(res.body[0].job_titles);
                    assert.deepProperty(res.body, '0.job_titles.0._id');
                    assert.deepProperty(res.body, '0.job_titles.0.average_week_work_time');
                    assert.deepProperty(res.body, '0.job_titles.0.count');
                })
                .end(done);
        });

        it('小寫 company 轉換成大寫', function(done) {
            request(app).get('/workings/statistics/by-company')
                .query({company: 'my goodjob Company'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'MY GOODJOB COMPANY');
                })
                .end(done);
        });

        it('company match any substring in workings.company.name', function(done) {
            request(app).get('/workings/statistics/by-company')
                .query({company: 'GOODJOB'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    assert.deepPropertyVal(res.body, '0._id.name', 'MY GOODJOB COMPANY');
                    assert.deepPropertyVal(res.body, '1._id.name', 'YOUR GOODJOB COMPANY');
                })
                .end(done);
        });

        it('sort job by average_week_work_time for every company', function(done) {
            request(app).get('/workings/statistics/by-company')
                .query({company: 'MY GOODJOB COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'MY GOODJOB COMPANY');
                    assert.deepPropertyVal(res.body, '0.job_titles.0._id', 'JOB2');
                    assert.deepPropertyVal(res.body, '0.job_titles.0.average_week_work_time', 20);
                    assert.deepPropertyVal(res.body, '0.job_titles.1._id', 'JOB1');
                    assert.deepPropertyVal(res.body, '0.job_titles.1.average_week_work_time', 15);
                })
                .end(done);
        });

        it('根據統編搜尋', function(done) {
            request(app).get('/workings/statistics/by-company')
                .query({company: '00000001'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'MY GOODJOB COMPANY');
                    assert.deepPropertyVal(res.body, '0.job_titles.0._id', 'JOB2');
                    assert.deepPropertyVal(res.body, '0.job_titles.1._id', 'JOB1');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /search-and-group/by-job-title', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    job_title: "ENGINEER1" , 
                    company: { id: "84149961", name: "COMPANY1" }, 
                    week_work_time: 40,
                    overtime_frequency: 0,
                    day_promised_work_time: 8,
                    day_real_work_time: 8,
                    created_at: new Date("2016-07-21T14:15:44.929Z"),
                    sector: "TAIPEI",
                }, 
                {
                    job_title: "ENGINEER1" , 
                    company: { id: "84149961", name: "COMPANY1"}, 
                    week_work_time: 40,
                    overtime_frequency: 2,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                },
                {
                    job_title: "ENGINEER2" , 
                    company:{ "name": "COMPANY"},
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                },
            ]);
        });

        it('error 422 if no job_title provided', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .expect(422)
                .end(done);
        });

        it('依照 job_title 來分群資料，結構正確', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, '0._id');
                    assert.deepProperty(res.body, '0.workings');
                    assert.isArray(res.body[0].workings);
                    assert.deepProperty(res.body, '0.workings.0.company.name');
                    assert.deepProperty(res.body, '0.workings.0.week_work_time');
                    assert.deepProperty(res.body, '0.workings.0.overtime_frequency');
                    assert.deepProperty(res.body, '0.workings.0.day_promised_work_time');
                    assert.deepProperty(res.body, '0.workings.0.day_real_work_time');
                    assert.deepProperty(res.body, '0.workings.0.created_at');
                    assert.deepProperty(res.body, '0.workings.0.sector');
                })
                .end(done);
        });

        it('小寫 job_title 轉換成大寫', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'engineer1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id', 'ENGINEER1');
                })
                .end(done);
        });

        it('job_title match any substring in workings.job_title', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    assert.deepPropertyVal(res.body, '0._id', 'ENGINEER1');
                    assert.deepPropertyVal(res.body, '1._id', 'ENGINEER2');
                })
                .end(done);
        });

        it('依照 created_at 由新到舊排序 group data', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id', 'ENGINEER1');
                    assert.deepPropertyVal(res.body, '0.workings.0.company.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body, '0.workings.0.week_work_time', 40);
                    assert.deepPropertyVal(res.body, '0.workings.0.overtime_frequency', 0);
                    assert.deepPropertyVal(res.body, '0.workings.0.day_promised_work_time', 8);
                    assert.deepPropertyVal(res.body, '0.workings.0.day_real_work_time', 8);
                    assert.equalDate(new Date(res.body[0].workings[0].created_at), new Date("2016-07-21T14:15:44.929Z"));
                    assert.deepPropertyVal(res.body, '0.workings.0.sector', "TAIPEI");
                    assert.deepPropertyVal(res.body, '0.workings.1.company.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body, '0.workings.1.week_work_time', 40);
                    assert.deepPropertyVal(res.body, '0.workings.1.overtime_frequency', 2);
                    assert.deepPropertyVal(res.body, '0.workings.1.day_promised_work_time', 8);
                    assert.deepPropertyVal(res.body, '0.workings.1.day_real_work_time', 10);
                    assert.equalDate(new Date(res.body[0].workings[1].created_at), new Date("2016-07-20T14:15:44.929Z"));
                    assert.deepPropertyVal(res.body, '0.workings.1.sector', "TAIPEI");
                    let workings = res.body[0].workings;
                    for(let idx=0; idx < workings.length-1; ++idx) {
                        assert.afterDate(new Date(workings[idx].created_at), new Date(workings[idx+1].created_at)); 
                    }
                })
                .end(done);
        });

        it('依照 group data 數量由大到小排序 job_title', function(done) {
            request(app).get('/workings/search-and-group/by-job-title')
                .query({job_title: 'ENGINEER'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    for(let idx=0; idx < res.body.length-1; ++idx) {
                        assert(res.body[idx].workings.length >= res.body[idx+1].workings.length);
                    }
                })
                .end(done);
        });


        after(function() {
            return db.collection('workings').remove({});
        });
    });


    describe('GET /workings/companies/search', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 10,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 20,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB2',
                    week_work_time: 20,
                },
                {
                    company: {
                        name: 'YOUR GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 25,
                },
                {
                    company: {
                        name: 'OTHER BADJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 40,
                },
            ]);
        });

        it('error 422 if no key provided', function(done) {
            request(app).get('/workings/companies/search')
                .expect(422)
                .end(done);
        });

        it('正確搜尋出公司名稱', function(done) {
            request(app).get('/workings/companies/search')
                .query({key: 'GOODJOB'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('小寫關鍵字轉換成大寫', function(done) {
            request(app).get('/workings/companies/search')
                .query({key: 'goodjob'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /workings/jobs/search', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 10,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 20,
                },
                {
                    company: {
                        id: '00000001',
                        name: 'MY GOODJOB COMPANY',
                    },
                    job_title: 'JOB2',
                    week_work_time: 20,
                },
                {
                    company: {
                        name: 'YOUR GOODJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 25,
                },
                {
                    company: {
                        name: 'OTHER BADJOB COMPANY',
                    },
                    job_title: 'JOB1',
                    week_work_time: 40,
                },
            ]);
        });

        it('error 422 if no key provided', function(done) {
            request(app).get('/workings/jobs/search')
                .expect(422)
                .end(done);
        });

        it('正確搜尋出職稱', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'JOB'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('正確搜尋出職稱', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'JOB1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 1);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        it('小寫關鍵字轉換成大寫', function(done) {
            request(app).get('/workings/jobs/search')
                .query({key: 'job'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });
});

function generatePayload(opt) {
    opt = opt || {};
    const valid = {
        access_token: 'random',
        job_title: 'test',
        week_work_time: '40',
        overtime_frequency: '3',
        day_promised_work_time: '8',
        day_real_work_time: '10',
        company_id: '00000000',
        company: 'GoodJob',
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

    return payload;
}

