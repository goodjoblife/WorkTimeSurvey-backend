const chai = require('chai');
chai.use(require('chai-datetime'));

const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const sinon = require('sinon');
require('sinon-as-promised');
const config = require('config');

describe('Workings 工時資訊', () => {
    let db;

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    describe('GET /workings', () => {
        let sandbox;

        before('Seeding some workings', () => db.collection('workings').insertMany([
            {
                company: { name: "companyA" },
                created_at: new Date("2016-11-13T06:10:04.023Z"),
                job_title: "engineer1",
                week_work_time: 40,
                overtime_frequency: 1,
                salary: { amount: 22000, type: "month" },
                estimated_hourly_wage: 100,
                data_time: { year: 2016, month: 10 },
                sector: "Taipei", //optional
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
                sector: "Taipei", //optional
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
            },
            {
                company: { name: "companyB" },
                created_at: new Date("2016-11-13T01:58:18.055Z"),
                job_title: "engineer2",
                    // 有的沒有工時資訊，如果不是時薪，不會有估計時薪
                salary: { amount: 22000, type: "month" },
                data_time: { year: 2016, month: 10 },
                sector: "Tainan",
            },
        ]));

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        for (let sort_field of [undefined, 'created_at', 'week_work_time', 'estimated_hourly_wage']) {
            it(`return the pagination with SORT_FIELD: ${sort_field}`, () => request(app).get('/workings')
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200)
                    .expect((res) => {
                        assert.propertyVal(res.body, 'total', 4);
                        assert.property(res.body, 'time_and_salary');
                        assert.lengthOf(res.body.time_and_salary, 4);
                    }));

            it(`return correct default order with SORT_FIELD: ${sort_field}`, () => request(app).get('/workings')
                    .query({
                        sort_by: sort_field,
                    })
                    .expect(200)
                    .expect((res) => {
                        if (sort_field === undefined) {
                            sort_field = 'created_at';
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
                            assert(workings[idx][sort_field] <= workings[idx - 1][sort_field]);
                        }
                        for (let idx = undefined_start_idx; idx < workings.length; idx += 1) {
                            assert.isUndefined(workings[idx][sort_field]);
                        }
                    }));
        }

        it(`sort_by ascending order with default SORT_FIELD 'created_at'`, () => request(app).get('/workings')
                .query({
                    order: 'ascending',
                })
                .expect(200)
                .expect((res) => {
                    // sort_field default is field 'created_at'
                    const sort_field = 'created_at';
                    const workings = res.body.time_and_salary;

                    for (let idx = 1; idx < workings.length; idx += 1) {
                        assert(workings[idx][sort_field] >= workings[idx - 1][sort_field]);
                    }
                }));

        it(`sort_by ascending order with SORT_FIELD 'week_work_time'`, () => request(app).get('/workings')
                .query({
                    sort_by: 'week_work_time',
                    order: 'ascending',
                })
                .expect(200)
                .expect((res) => {
                    const sort_field = 'week_work_time';
                    const workings = res.body.time_and_salary;

                    const undefined_idx = 3;
                    for (let idx = 1; idx < undefined_idx; idx += 1) {
                        assert(workings[idx][sort_field] >= workings[idx - 1][sort_field]);
                    }
                    for (let idx = undefined_idx; idx < workings.length; idx += 1) {
                        assert.isUndefined(workings[idx][sort_field]);
                    }
                }));

        it(`欄位是 undefined 的資料全部會被放在 defined 的資料的後面`, () => request(app).get('/workings')
                .query({
                    sort_by: 'week_work_time',
                    order: 'ascending',
                    limit: '2',
                    page: '1',
                })
                .expect(200)
                .expect((res) => {
                    const sort_field = 'week_work_time';
                    const workings = res.body.time_and_salary;

                    assert.isDefined(workings[0][sort_field]);
                    assert.isUndefined(workings[1][sort_field]);
                }));

        after(() => db.collection('workings').remove({}));

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe('GET /search_by/company/group_by/company', () => {
        let sandbox;

        before('Seeding some workings', () => db.collection('workings').insertMany([
            {
                job_title: "ENGINEER1",
                company: { id: "84149961", name: "COMPANY1" },
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
                has_overtime_salary: "yes",
                is_overtime_salary_legal: "yes",
                has_compensatory_dayoff: "yes",
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
                company: { id: "84149961", name: "COMPANY1" },
                is_currently_employed: 'yes',
                data_time: {
                    year: 2016,
                    month: 5,
                },
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T02:00:00.000Z"),
                author: {
                },
                    //
                week_work_time: 55,
                overtime_frequency: 3,
                day_promised_work_time: 8,
                day_real_work_time: 11,
                has_overtime_salary: "yes",
                is_overtime_salary_legal: "no",
                has_compensatory_dayoff: "no",
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
                company: { id: "84149961", name: "COMPANY1" },
                is_currently_employed: 'yes',
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T03:00:00.000Z"),
                    //
                week_work_time: 45,
                overtime_frequency: 1,
                day_promised_work_time: 9,
                day_real_work_time: 10,
                has_overtime_salary: "yes",
                is_overtime_salary_legal: "don't know",
                has_compensatory_dayoff: "no",
            },
            {
                job_title: "ENGINEER2",
                company: { id: "84149961", name: "COMPANY1" },
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
                company: { id: "84149961", name: "COMPANY1" },
                is_currently_employed: 'yes',
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T05:00:00.000Z"),
                    //
                week_work_time: 60,
                overtime_frequency: 3,
                day_promised_work_time: 8,
                day_real_work_time: 10,
                has_overtime_salary: "no",
                has_compensatory_dayoff: "yes",
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
                company: { name: "COMPANY2" },
                is_currently_employed: 'yes',
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T06:00:00.000Z"),
                data_time: {
                    year: 2016,
                    month: 7,
                },
                sector: "TAIPEI",
                author: {
                },
                    //
                week_work_time: 60,
                overtime_frequency: 3,
                day_promised_work_time: 8,
                day_real_work_time: 10,
                has_overtime_salary: "no",
                is_overtime_salary_legal: "yes",
                has_compensatory_dayoff: "yes",
                    //
                salary: {
                    type: 'day',
                    amount: 100,
                },
                estimated_hourly_wage: 100,
                experience_in_year: 1,
            },
            {
                job_title: "ENGINEER4",
                company: { name: "COMPANY3" },
                is_currently_employed: 'yes',
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T06:00:00.000Z"),
                data_time: {
                    year: 2016,
                    month: 7,
                },
                author: {
                },
                    // no work time data
                    //
                salary: {
                    type: 'month',
                    amount: 22000,
                },
                experience_in_year: 1,
            },
        ]));

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        it('error 422 if no company provided', () => request(app).get('/workings/search_by/company/group_by/company')
                .expect(422)
                .then((res) => {
                }));

        it('依照 company 來分群資料，結構正確 (workings.length >= 5)', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY1',
                })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], 'company');
                    assert.deepProperty(res.body[0], 'company.name');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isObject(res.body[0].average);
                    assert.deepProperty(res.body[0], 'average.week_work_time');
                    assert.deepProperty(res.body[0], 'average.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isArray(res.body[0].time_and_salary);
                    assert(res.body[0].time_and_salary.length >= 5);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.job_title');
                    // The first one don't have sector, see #183
                    // assert.deepProperty(res.body[0], 'time_and_salary.0.sector');
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
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_overtime_salary_legal');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_compensatory_dayoff');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.yes');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.no');
                    assert.deepProperty(res.body[0], 'has_overtime_salary_count.don\'t know');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.yes');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.no');
                    assert.deepProperty(res.body[0], 'is_overtime_salary_legal_count.don\'t know');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.yes');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.no');
                    assert.deepProperty(res.body[0], 'has_compensatory_dayoff_count.don\'t know');
                    //
                    assert.deepProperty(res.body[0], 'time_and_salary.0.experience_in_year');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary');
                    assert.isObject(res.body[0].time_and_salary[0].salary);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.type');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.amount');
                    //
                    assert.propertyVal(res.body[0], 'count', 5);
                }));

        it('依照 company 來分群資料，結構正確 (workings.length < 5)', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY2',
                })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], 'company');
                    assert.deepProperty(res.body[0], 'company.name');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isObject(res.body[0].average);
                    assert.deepProperty(res.body[0], 'average.week_work_time');
                    assert.deepProperty(res.body[0], 'average.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isArray(res.body[0].time_and_salary);
                    assert(res.body[0].time_and_salary.length < 5);
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
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_overtime_salary_legal');
                    assert.notDeepProperty(res.body[0], 'time_and_salary.0.has_compensatory_dayoff');
                    assert.notDeepProperty(res.body[0], 'has_overtime_salary_count');
                    assert.notDeepProperty(res.body[0], 'is_overtime_salary_legal_count');
                    assert.notDeepProperty(res.body[0], 'has_compensatory_dayoff_count');
                    //
                    assert.deepProperty(res.body[0], 'time_and_salary.0.experience_in_year');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary');
                    assert.isObject(res.body[0].time_and_salary[0].salary);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.type');
                    assert.deepProperty(res.body[0], 'time_and_salary.0.salary.amount');
                    //
                    assert.propertyVal(res.body[0], 'count', 1);
                }));

        it('小寫 company query 轉換成大寫', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'company1',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body[0], 'company.name', 'COMPANY1');
                }));

        it('company match any substring in company.name', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 3);
                    assert.deepPropertyVal(res.body[0], 'company.name', 'COMPANY2');
                    assert.deepPropertyVal(res.body[1], 'company.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body[2], 'company.name', 'COMPANY3');
                }));

        it('依照 group_sort_order 排序 group data', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY',
                    group_sort_by: 'week_work_time',
                    group_sort_order: 'ascending',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 3);
                    assert.deepPropertyVal(res.body[0], 'company.name', 'COMPANY1');
                    assert.deepPropertyVal(res.body[1], 'company.name', 'COMPANY2');
                    assert.deepPropertyVal(res.body[2], 'company.name', 'COMPANY3');
                }));

        it('依照 job_title 排序 data in company group', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY1',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body[0].time_and_salary, '0.job_title', 'ENGINEER1');
                    assert.deepPropertyVal(res.body[0].time_and_salary, '2.job_title', 'ENGINEER2');
                    assert.deepPropertyVal(res.body[0].time_and_salary, '4.job_title', 'ENGINEER3');
                }));

        it('根據統編搜尋', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: '84149961',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body, '0.company.id', '84149961');
                }));

        it('當 workings.length >= 5, has_overtime_salary_count values 加總會小於等於 workings.length', () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY1',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].has_overtime_salary_count.yes;
                    total += res.body[0].has_overtime_salary_count.no;
                    total += res.body[0].has_overtime_salary_count["don't know"];
                    assert(total <= res.body[0].time_and_salary.length);
                }));

        it('當 workings.length >= 5, has_overtime_salary_count.yes 會大於等於 is_overtime_salary_legal_count values 加總',
            () => request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY1',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    let total = 0;
                    total += res.body[0].is_overtime_salary_legal_count.yes;
                    total += res.body[0].is_overtime_salary_legal_count.no;
                    total += res.body[0].is_overtime_salary_legal_count["don't know"];
                    assert(res.body[0].has_overtime_salary_count.yes >= total);
                }));

        it('平均值是 null 的會放在全部資料的最後面', () => {
            const sort_field = 'week_work_time';

            return request(app).get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'COMPANY',
                    group_sort_by: sort_field,
                    group_sort_order: 'ascending',
                    access_token: 'faketoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 3);
                    assert.isNotNull(res.body[0].average[sort_field]);
                    assert.isNull(res.body[2].average[sort_field]);
                });
        });

        it('要回傳 [] 如果沒有搜尋到資料', async () => {
            const res = await request(app)
                .get('/workings/search_by/company/group_by/company')
                .query({
                    company: 'NO_COMPANY',
                    group_sort_by: 'week_work_time',
                    group_sort_order: 'ascending',
                    access_token: 'faketoken',
                })
                .expect(200);

            assert.isArray(res.body);
            assert.lengthOf(res.body, 0, 'res.body is an empty array');
        });

        after(() => db.collection('workings').remove({}));

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe('GET /search_by/job_title/group_by/company', () => {
        let sandbox;

        before('Seeding some workings', () => db.collection('workings').insertMany([
            {
                job_title: "ENGINEER1",
                company: { id: "84149961", name: "COMPANY1" },
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
                company: { id: "84149961", name: "COMPANY1" },
                is_currently_employed: 'yes',
                data_time: {
                    year: 2016,
                    month: 5,
                },
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
                company: { id: "84149961", name: "COMPANY1" },
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
                company: { id: "84149961", name: "COMPANY1" },
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
                company: { name: "COMPANY2" },
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
            {
                job_title: "ENGINEER4",
                company: { name: "COMPANY3" },
                is_currently_employed: 'yes',
                employment_type: 'full-time',
                created_at: new Date("2016-07-20T06:00:00.000Z"),
                data_time: {
                    year: 2016,
                    month: 7,
                },
                author: {
                },
                    // no work time data
                    //
                salary: {
                    type: 'month',
                    amount: 22000,
                },
                experience_in_year: 1,
            },
        ]));

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        it('error 422 if no job_title provided', () => request(app).get('/workings/search_by/job_title/group_by/company')
                .expect(422)
                .expect((res) => {
                }));

        it('依照 company 來分群資料，結構正確', () => request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    job_title: 'ENGINEER1',
                })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body[0], 'company.name');
                    assert.deepProperty(res.body[0], 'average');
                    assert.isObject(res.body[0].average);
                    assert.deepProperty(res.body[0], 'average.week_work_time');
                    assert.deepProperty(res.body[0], 'average.estimated_hourly_wage');
                    assert.deepProperty(res.body[0], 'time_and_salary');
                    assert.isArray(res.body[0].time_and_salary);
                    assert.deepProperty(res.body[0], 'time_and_salary.0.job_title');
                    // see #183
                    // assert.deepProperty(res.body[0], 'time_and_salary.0.sector');
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
                }));

        it('小寫 job_title 轉換成大寫', () => request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    job_title: 'engineer1',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 1);
                    assert.deepPropertyVal(res.body[0], 'time_and_salary.0.job_title', 'ENGINEER1');
                }));

        it('job_title match any substring in 薪時資訊.job_title 欄位', () => request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    job_title: 'ENGINEER',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body[0].time_and_salary, 1);
                    assert.deepPropertyVal(res.body[0], 'time_and_salary.0.job_title', 'ENGINEER3');
                    assert.lengthOf(res.body[1].time_and_salary, 4);
                    assert.deepPropertyVal(res.body[1], 'time_and_salary.0.job_title', 'ENGINEER1');
                    assert.deepPropertyVal(res.body[1], 'time_and_salary.2.job_title', 'ENGINEER2');
                }));

        it('依照 group_sort_order 排序 group data', () => {
            const sort_field = 'week_work_time';

            return request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    group_sort_by: sort_field,
                    job_title: 'ENGINEER',
                    group_sort_order: 'ascending',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 3);
                    assert(res.body[0].average[sort_field] <= res.body[1].average[sort_field]);
                    assert.isNull(res.body[2].average[sort_field]);
                });
        });

        it('平均值是 null 的會放在全部資料的最後面', () => {
            const sort_field = 'week_work_time';

            return request(app).get('/workings/search_by/job_title/group_by/company')
                .query({
                    job_title: 'ENGINEER',
                    group_sort_by: sort_field,
                    group_sort_order: 'ascending',
                    access_token: 'faketoken',
                })
                .expect(200)
                .expect((res) => {
                    assert.lengthOf(res.body, 3);
                    assert.isNotNull(res.body[0].average[sort_field]);
                    assert.isNull(res.body[2].average[sort_field]);
                });
        });

        it('要回傳 [] 如果沒有搜尋到資料', async () => {
            const res = await request(app)
                .get('/workings/search_by/job_title/group_by/company')
                .query({
                    job_title: 'NO_JOB',
                    group_sort_by: 'week_work_time',
                    group_sort_order: 'ascending',
                    access_token: 'faketoken',
                })
                .expect(200);

            assert.isArray(res.body);
            assert.lengthOf(res.body, 0, 'res.body is an empty array');
        });

        after(() => db.collection('workings').remove({}));

        afterEach(() => {
            sandbox.restore();
        });
    });

    describe('GET /workings/companies/search', () => {
        before('Seeding some workings', () => db.collection('workings').insertMany([
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
        ]));

        it('error 422 if no key provided', () => request(app).get('/workings/companies/search')
                .expect(422));

        it('正確搜尋出公司名稱', () => request(app).get('/workings/companies/search')
                .query({ key: 'GOODJOB' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                }));

        it('小寫關鍵字轉換成大寫', () => request(app).get('/workings/companies/search')
                .query({ key: 'goodjob' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                }));

        after(() => db.collection('workings').remove({}));
    });

    describe('GET /workings/jobs/search', () => {
        before('Seeding some workings', () => db.collection('workings').insertMany([
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
        ]));

        it('error 422 if no key provided', () => request(app).get('/workings/jobs/search')
                .expect(422));

        it('正確搜尋出職稱', () => request(app).get('/workings/jobs/search')
                .query({ key: 'JOB' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                }));

        it('正確搜尋出職稱', () => request(app).get('/workings/jobs/search')
                .query({ key: 'JOB1' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 1);
                    assert.deepProperty(res.body, '0._id');
                }));

        it('小寫關鍵字轉換成大寫', () => request(app).get('/workings/jobs/search')
                .query({ key: 'job' })
                .expect(200)
                .expect((res) => {
                    assert.isArray(res.body);
                    assert.lengthOf(res.body, 2);
                    assert.deepProperty(res.body, '0._id');
                }));

        after(() => db.collection('workings').remove({}));
    });
});
