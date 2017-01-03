const chai = require('chai');
chai.use(require('chai-datetime'));
const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;

describe('Workings 工時資訊', function() {
    var db = undefined;

    before('DB: Setup', function() {
        return MongoClient.connect(process.env.MONGODB_URI).then(function(_db) {
            db = _db;
        });
    });

    describe('GET /workings', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    overtime_frequency: 1,
                    sector: "AAA",
                    created_at: new Date("2016-09-06 08:00"),
                },
                {
                    overtime_frequency: 2,
                    created_at: new Date("2016-09-06 09:00"),
                },
                {
                    overtime_frequency: 1,
                    sector: "CCC",
                    created_at: new Date("2016-09-06 09:03"),
                },
                {
                    overtime_frequency: 4,
                    created_at: new Date("2016-09-06 09:04"),
                },
            ]);
        });

        it('return the pagination', function(done) {
            request(app).get('/workings')
                .expect(200)
                .expect(function(res) {
                    assert.propertyVal(res.body, 'total', 4);
                    assert.property(res.body, 'time_and_salary');
                    assert.lengthOf(res.body.time_and_salary, 4);
                })
                .end(done);
        });

        it('return the correct field', function(done) {
            request(app).get('/workings')
                .expect(200)
                .expect(function(res) {
                    const time_and_salary = res.body.time_and_salary;

                    assert.deepPropertyVal(time_and_salary, '0.overtime_frequency', 4);
                    assert.notDeepProperty(time_and_salary, '0.author');
                    assert.notDeepProperty(time_and_salary, '0.sector');
                    assert.deepPropertyVal(time_and_salary, '1.sector', 'CCC');
                    assert.notDeepProperty(time_and_salary, '2.sector');
                    assert.deepPropertyVal(time_and_salary, '3.sector', 'AAA');
                })
                .end(done);
        });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe.skip('GET /search-and-group/by-company', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1" },
                    week_work_time: 40,
                    overtime_frequency: 0,
                    day_promised_work_time: 8,
                    day_real_work_time: 8,
                    created_at: new Date("2016-07-21T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "yes",
                    has_compensatory_dayoff: "yes",
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 40,
                    overtime_frequency: 2,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "no",
                    has_compensatory_dayoff: "no",
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 55,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 11,
                    created_at: new Date("2016-07-22T14:15:44.929Z"),
                    sector: "TAINAN",
                    has_overtime_salary: "yes",
                    is_overtime_salary_legal: "don't know",
                    has_compensatory_dayoff: "no",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 45,
                    overtime_frequency: 1,
                    day_promised_work_time: 9,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-23T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "yes",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 47,
                    overtime_frequency: 3,
                    day_promised_work_time: 7,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAICHUNG",
                    has_overtime_salary: "don't know",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 38,
                    overtime_frequency: 0,
                    day_promised_work_time: 7,
                    day_real_work_time: 7,
                    created_at: new Date("2016-07-25T14:15:44.929Z"),
                    sector: "TAICHUNG",
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    week_work_time: 44,
                    overtime_frequency: 1,
                    day_promised_work_time: 8,
                    day_real_work_time: 7,
                    created_at: new Date("2016-07-29T14:15:44.929Z"),
                    sector: "TAICHUNG",
                    has_overtime_salary: "yes",
                },
                {
                    job_title: "ENGINEER2",
                    company: {name: "COMPANY2"},
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    created_at: new Date("2016-07-20T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "don't know",
                },
                {
                    job_title: "ENGINEER3",
                    company: {name: "COM_PANY"},
                    week_work_time: 66,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 12,
                    created_at: new Date("2016-07-30T14:15:44.929Z"),
                    sector: "TAIPEI",
                    has_overtime_salary: "no",
                    has_compensatory_dayoff: "yes",
                },
            ]);
        });

        it('error 422 if no company provided', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .expect(422)
                .end(done);
        });

        it('依照 company 來分群資料，結構正確 (workings.length >= 5)', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], '_id');
                    assert.deepProperty(res.body[0], '_id.name');
                    assert.deepProperty(res.body[0], 'workings');
                    assert.isArray(res.body[0].workings);
                    assert(res.body[0].workings.length >= 5);
                    assert.deepProperty(res.body[0], 'workings.0.job_title');
                    assert.deepProperty(res.body[0], 'workings.0.week_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.overtime_frequency');
                    assert.deepProperty(res.body[0], 'workings.0.day_promised_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.day_real_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.created_at');
                    assert.deepProperty(res.body[0], 'workings.0.sector');
                    assert.deepProperty(res.body[0], 'count');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.yes');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.no');
                    assert.deepProperty(res.body[0], "has_overtime_salary_count.don't know");
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.yes');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.no');
                    assert.deepProperty(res.body[0], "is_overtime_salary_legal_count.don't know");
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.yes');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.no');
                    assert.deepProperty(res.body[0], "has_compensatory_dayoff_count.don't know");
                })
                .end(done);
        });

        it('依照 company 來分群資料，結構正確 (workings.length < 5)', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY2'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], '_id');
                    assert.deepProperty(res.body[0], '_id.name');
                    assert.deepProperty(res.body[0], 'workings');
                    assert.isArray(res.body[0].workings);
                    assert(res.body[0].workings.length < 5);
                    assert.deepProperty(res.body[0], 'workings.0.job_title');
                    assert.deepProperty(res.body[0], 'workings.0.week_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.overtime_frequency');
                    assert.deepProperty(res.body[0], 'workings.0.day_promised_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.day_real_work_time');
                    assert.deepProperty(res.body[0], 'workings.0.created_at');
                    assert.deepProperty(res.body[0], 'workings.0.sector');
                    assert.deepProperty(res.body[0], 'count');
                    assert.notDeepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.notDeepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.notDeepProperty(res.body[0], 'has_compensatory_dayoff_count');
                })
                .end(done);
        });

        it('小寫 company query 轉換成大寫', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'company1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');
                })
                .end(done);
        });

        it('company match any substring in _id.name', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body, '1._id.name', 'COMPANY2');
                })
                .end(done);
        });

        it('依照 job_title 排序 group data', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.name', 'COMPANY1');

                    let workings = res.body[0].workings;
                    assert.deepPropertyVal(workings, '2.job_title', 'ENGINEER1');
                    assert.deepPropertyVal(workings, '3.job_title', 'ENGINEER2');
                })
                .end(done);
        });

        it('依照 group data 數量由大到小排序 company', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    for (let idx=0; idx < res.body.length-1; ++idx) {
                        assert(res.body[idx].workings.length >= res.body[idx+1].workings.length);
                    }
                })
                .end(done);
        });

        it('根據統編搜尋', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: '84149961'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0._id.id', '84149961');
                })
                .end(done);
        });

        it('當 workings.length >= 5, has_overtime_salary_count values 加總會小於等於 workings.length', function(done) {
            request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].has_overtime_salary_count.yes;
                    total += res.body[0].has_overtime_salary_count.no;
                    total += res.body[0].has_overtime_salary_count["don't know"];
                    assert(total <= res.body[0].workings.length);

                })
                .end(done);
        });

        it('當 workings.length >= 5, has_overtime_salary_count.yes 會大於等於 is_overtime_salary_legal_count values 加總',
            function(done) {
                request(app).get('/workings/search-and-group/by-company')
                .query({company: 'COMPANY1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].is_overtime_salary_legal_count.yes;
                    total += res.body[0].is_overtime_salary_legal_count.no;
                    total += res.body[0].is_overtime_salary_legal_count["don't know"];
                    assert(res.body[0].has_overtime_salary_count.yes >= total);
                })
                .end(done);
            });

        after(function() {
            return db.collection('workings').remove({});
        });
    });

    describe('GET /search_by/job_title/group_by/company', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    is_currently_employed: 'yes',
                    data_time: {
                        year: 2016,
                        month: 7,
                    },
                    sector: "TAIPEI",
                    employment_type: 'full-time',
                    created_at: new Date("2016-07-20T10:00:00.929Z"),
                    author: {
                    },
                    //
                    week_work_time: 40,
                    overtime_frequency: 0,
                    day_promised_work_time: 8,
                    day_real_work_time: 8,
                    //
                    salary: {
                        type: 'day',
                        amount: 100,
                    },
                    estimated_hourly_wage: 100,
                    experience_in_year: 1,
                },
                {
                    job_title: "ENGINEER1",
                    company: {id: "84149961", name: "COMPANY1"},
                    is_currently_employed: 'yes',
                    employment_type: 'full-time',
                    created_at: new Date("2016-07-20T02:00:00.000Z"),
                    author: {
                    },
                    //
                    week_work_time: 55,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 11,
                    //
                    salary: {
                        type: 'day',
                        amount: 100,
                    },
                    estimated_hourly_wage: 100,
                    experience_in_year: 1,
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    is_currently_employed: 'yes',
                    employment_type: 'full-time',
                    created_at: new Date("2016-07-20T03:00:00.000Z"),
                    //
                    week_work_time: 45,
                    overtime_frequency: 1,
                    day_promised_work_time: 9,
                    day_real_work_time: 10,
                },
                {
                    job_title: "ENGINEER2",
                    company: {id: "84149961", name: "COMPANY1"},
                    is_currently_employed: 'yes',
                    employment_type: 'full-time',
                    created_at: new Date("2016-07-20T04:00:00.000Z"),
                    //
                    salary: {
                        type: 'day',
                        amount: 100,
                    },
                    estimated_hourly_wage: 100,
                    experience_in_year: 1,
                },
                {
                    job_title: "ENGINEER3",
                    company: {name: "COMPANY2"},
                    is_currently_employed: 'yes',
                    employment_type: 'full-time',
                    created_at: new Date("2016-07-20T05:00:00.000Z"),
                    //
                    week_work_time: 60,
                    overtime_frequency: 3,
                    day_promised_work_time: 8,
                    day_real_work_time: 10,
                    //
                    salary: {
                        type: 'day',
                        amount: 100,
                    },
                    estimated_hourly_wage: 100,
                    experience_in_year: 1,
                },
            ]);
        });

        it('error 422 if no job_title provided', function(done) {
            request(app).get('/workings/search_by/job_title/group_by/company')
                .expect(422)
                .end(done);
        });

        it('依照 company 來分群資料，結構正確', function(done) {
            request(app).get('/workings/search_by/job_title/group_by/company')
                .query({job_title: 'ENGINEER1'})
                .expect(200)
                .expect(function(res) {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], 'company.name');
                    assert.deepProperty(res.body[0], 'average');
                    assert.isObject(res.body[0].average);
                    assert.deepProperty(res.body[0], 'average.week_work_time');
                    assert.deepProperty(res.body[0], 'average.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isArray(res.body[0].time_and_salary);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.job_title');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.sector');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.employment_type');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.created_at');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.data_time');
                    assert.isObject(res.body[0].time_and_salary[0].data_time);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.data_time.year');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.data_time.month');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.author');
                    //
                    assert.deepProperty(res.body[0], 'time_and_salary.0.week_work_time');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.overtime_frequency');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.day_promised_work_time');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.day_real_work_time');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_overtime_salary');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.is_overtime_salary_legal');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_compensatory_dayoff');
                    //
                    assert.deepProperty(res.body[0], 'time_and_salary.0.experience_in_year');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary');
                    assert.isObject(res.body[0].time_and_salary[0].salary);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.type');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.amount');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.estimated_hourly_wage');
                })
                .end(done);
        });

        it('小寫 job_title 轉換成大寫', function(done) {
            request(app).get('/workings/search_by/job_title/group_by/company')
                .query({job_title: 'engineer1'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body[0], 'time_and_salary.0.job_title', 'ENGINEER1');
                })
                .end(done);
        });

        it('job_title match any substring in 薪時資訊.job_title 欄位', function(done) {
            request(app).get('/workings/search_by/job_title/group_by/company')
                .query({job_title: 'ENGINEER'})
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body[0].time_and_salary, 1);
                    assert.deepPropertyVal(res.body[0], 'time_and_salary.0.job_title', 'ENGINEER3');
                    assert.lengthOf(res.body[1].time_and_salary, 4);
                    assert.deepPropertyVal(res.body[1], 'time_and_salary.0.job_title', 'ENGINEER1');
                    assert.deepPropertyVal(res.body[1], 'time_and_salary.2.job_title', 'ENGINEER2');
                })
                .end(done);
        });

        it('依照 group_sort_order 排序 group data', function(done) {
            request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    group_sort_by: 'week_work_time',
                    job_title: 'ENGINEER',
                    group_sort_order: 'ascending',

                })
                .expect(200)
                .expect(function(res) {
                    assert.lengthOf(res.body, 2);
                    for (let idx = 1; idx < res.body.length; ++idx) {
                        assert(res.body[idx].average.week_work_time >= res.body[idx-1].average.week_work_time);
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

    describe.skip('GET /workings', function() {
        before('Seeding some workings', function() {
            return db.collection('workings').insertMany([
                {
                    company: {name: "companyA"},
                    created_at: new Date("2016-11-13T06:10:04.023Z"),
                    job_title: "engineer1",
                    week_work_time: 40,
                    overtime_frequency: 1,
                    salary: {amount: 22000, type: "month"},
                    estimated_hourly_wage: 100,
                    data_time: {year: 2016, month: 10},
                    sector: "Taipei", //optional
                },
                {
                    company: {name: "companyC"},
                    created_at: new Date("2016-11-13T17:10:04.023Z"),
                    job_title: "engineer3",
                    week_work_time: 50,
                    overtime_frequency: 1,
                    salary: {amount: 22000, type: "month"},
                    estimated_hourly_wage: 120,
                    data_time: {year: 2016, month: 10},
                    sector: "Taipei", //optional
                },
                {
                    company: {name: "companyB"},
                    created_at: new Date("2016-11-13T01:59:18.055Z"),
                    job_title: "engineer2",
                    week_work_time: 47.5,
                    overtime_frequency: 3,
                    //有的沒有薪資資訊，當然也不會有估計時薪
                    data_time: {year: 2016, month: 10},
                    sector: "Tainan",
                },
                {
                    company: {name: "companyB"},
                    created_at: new Date("2016-11-13T01:58:18.055Z"),
                    job_title: "engineer2",
                    //有的沒有工時資訊，如果不是時薪，不會有估計時薪
                    salary: {amount: 22000, type: "month"},
                    data_time: {year: 2016, month: 10},
                    sector: "Tainan",
                },
            ]);
        });

        for (let sort_field of ['created_at', 'week_work_time', 'estimated_hourly_wage']) {
            it(`return the pagination with SORT_FIELD ${sort_field}`, function(done) {
                request(app).get('/workings')
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body, 'total', 4);
                        assert.property(res.body, 'time_and_salary');
                        assert.lengthOf(res.body.time_and_salary, 4);
                    })
                    .end(done);
            });

            it(`return the correct order with SORT_FIELD: ${sort_field}`, function(done) {
                request(app).get('/workings')
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200)
                    .expect(function(res) {
                        const workings = res.body.time_and_salary;
                        let undefined_idx = workings.length;
                        for (let idx in workings) {
                            if (workings[idx][sort_field] === undefined) {
                                undefined_idx = idx;
                                break;
                            }
                        }

                        let num = workings[0][sort_field];
                        for (let idx=1; idx<workings.length && idx < undefined_idx; ++idx) {
                            assert(workings[idx][sort_field] <= num);
                            num = workings[idx][sort_field];
                        }
                        for (let idx=undefined_idx; idx<workings.length; ++idx) {
                            assert.isUndefined(workings[idx][sort_field]);
                        }

                    })
                    .end(done);
            });
        }

        after(function() {
            return db.collection('workings').remove({});
        });
    });
});

