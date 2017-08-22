const chai = require('chai');

const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const sinon = require('sinon');
const config = require('config');
const authentication = require('../libs/authentication');
const ObjectId = require('mongodb').ObjectId;

function generateWorkingTimeRelatedPayload(options) {
    const opt = options || {};
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
        status: 'published',
    };

    const payload = {};
    for (const key in valid) {
        if (opt[key]) {
            if (opt[key] !== -1) {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (const key in opt) {
        if (opt[key] !== -1) {
            payload[key] = opt[key];
        }
    }

    return payload;
}

function generateSalaryRelatedPayload(options) {
    const opt = options || {};
    const valid = {
        access_token: 'random',
        job_title: 'test',
        company_id: '00000001',
        is_currently_employed: 'yes',
        employment_type: 'full-time',
        salary_type: 'year',
        salary_amount: '10000',
        experience_in_year: '10',
        status: 'published',
    };

    const payload = {};
    for (const key in valid) {
        if (opt[key]) {
            if (opt[key] !== -1) {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (const key in opt) {
        if (opt[key] !== -1) {
            payload[key] = opt[key];
        }
    }

    return payload;
}

function generateAllPayload(options) {
    const opt = options || {};
    const valid = {
        access_token: 'random',
        job_title: 'test',
        company_id: '00000001',
        is_currently_employed: 'yes',
        employment_type: 'full-time',
        // Salary related
        salary_type: 'year',
        salary_amount: '10000',
        experience_in_year: '10',
        // WorkingTime related
        week_work_time: '40',
        overtime_frequency: '3',
        day_promised_work_time: '8',
        day_real_work_time: '10',
        status: 'published',
    };

    const payload = {};
    for (const key in valid) {
        if (opt[key]) {
            if (opt[key] !== -1) {
                payload[key] = opt[key];
            }
        } else {
            payload[key] = valid[key];
        }
    }
    for (const key in opt) {
        if (opt[key] !== -1) {
            payload[key] = opt[key];
        }
    }

    return payload;
}

describe('Workings 工時資訊', () => {
    let db;
    let sandbox;
    let cachedFacebookAuthentication;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: '-1',
        facebook: {
            id: '-1',
            name: 'mark',
        },
    };

    before('DB: Setup', () => MongoClient.connect(config.get('MONGODB_URI')).then((_db) => {
        db = _db;
    }));

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        cachedFacebookAuthentication = sandbox.stub(authentication, 'cachedFacebookAuthentication');
        cachedFacebookAuthentication.withArgs(sinon.match.object, sinon.match.object, 'random')
            .resolves(fake_user);
        cachedFacebookAuthentication.withArgs(sinon.match.object, sinon.match.object, 'invalid')
            .rejects();
    });

    describe('POST /workings', () => {
        before('Seed companies', () => db.collection('companies').insertMany([
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
        ]));

        describe('Authentication & Authorization Part', () => {
            it('需要回傳 401 如果沒有 access_token', () => {
                sandbox.restore();
                return request(app).post('/workings')
                    .expect(401);
            });

            it('需要回傳 401 如果不能 FB 登入', () =>
                request(app).post('/workings')
                    .send({
                        access_token: 'invalid',
                    })
                    .expect(401)
                    .then((res) => {
                        sinon.assert.calledOnce(cachedFacebookAuthentication);
                    }));
        });

        describe('generate payload', () => {
            it('generateWorkingTimeRelatedPayload', async () => {
                const res = await request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload())
                    .expect(200);

                assert.equal(res.body.working.status, 'published');
                assert.deepPropertyVal(res.body, 'working.author.id', '-1');
                assert.deepPropertyVal(res.body, 'working.author.name', 'mark');
                assert.deepPropertyVal(res.body, 'working.author.type', 'facebook');
            });

            it('generateSalaryRelatedPayload', () => request(app).post('/workings')
                    .send(generateSalaryRelatedPayload())
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.working.status, 'published');
                    })
                );
        });

        describe('Common Data Validation Part', () => {
            it('job_title is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: -1,
                    }))
                    .expect(422));

            it('company or company_id is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company: -1,
                        company_id: -1,
                    }))
                    .expect(422));

            it('is_currently_employed is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: -1,
                    }))
                    .expect(422));

            describe('when is_currently_employed == "no"', () => {
                it('job_ending_time_year and job_ending_time_month are required', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                            job_ending_time_month: '12',
                        }))
                        .expect(200));

                it('job_ending_time_year are required', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_month: '12',
                        }))
                        .expect(422));

                it('job_ending_time_month are required', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                        }))
                        .expect(422));

                describe('job_ending_time_* should be reasonable', () => {
                    it('job_ending_time_year <= this year', () => {
                        const nextYear = new Date();
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: nextYear.getFullYear().toString(),
                                job_ending_time_month: '1',
                            }))
                            .expect(422);
                    });

                    it('job_ending_time_year > this year - 10', () => request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: ((new Date()).getFullYear() - 10).toString(),
                                job_ending_time_month: '1',
                            }))
                            .expect(422));

                    it('job_ending_time_* <= now', () => {
                        const now = new Date();

                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: now.getFullYear().toString(),
                                job_ending_time_month: (now.getMonth() + 1).toString(),
                            }))
                            .expect(200);
                    });

                    it('job_ending_time_* <= now', () => {
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);

                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: nextMonth.getFullYear().toString(),
                                job_ending_time_month: (nextMonth.getMonth() + 1).toString(),
                            }))
                            .expect(422);
                    });
                });
            });

            describe('when is_currently_employed == "yes"', () => {
                it('job_ending_time_year 不應該有', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                        }))
                        .expect(422));

                it('job_ending_time_month 不應該有', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_month: '12',
                        }))
                        .expect(422));
            });

            it('sector can be inserted', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        sector: 'Hello world',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.propertyVal(res.body.working, 'sector', 'Hello world');
                    }));

            for (const input of ['male', 'female', 'other']) {
                it(`gender can be ${input}`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            gender: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working, 'gender', input);
                        }));
            }

            for (const input of ['']) {
                it(`gender should not return if "${input}"`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            gender: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.notProperty(res.body.working, 'gender');
                        }));
            }

            it('gender fail if invalid input', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        gender: 'invalid',
                    }))
                    .expect(422));

            for (const input of ["full-time", "part-time", "intern", "temporary", "contract", "dispatched-labor"]) {
                it(`employment_type can be ${input}`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working, 'employment_type', input);
                        }));
            }

            for (const input of [-1, 'invalid']) {
                it('employment_type is required', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        }))
                        .expect(422));
            }
        });

        describe('WorkingTime Validation Part', () => {
            it('week_work_time is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: -1,
                    }))
                    .expect(422));

            it('week_work_time should be a number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "test",
                    }))
                    .expect(422));

            it('week_work_time should be a valid number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "186",
                    }))
                    .expect(422));

            it('week_work_time can be a floating number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "30.5",
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.deepPropertyVal(res.body, 'working.week_work_time', 30.5);
                    }));

            it('overtime_frequency is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: -1,
                    }))
                    .expect(422));

            it('overtime_frequency should in [0, 1, 2, 3]', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: '5',
                    }))
                    .expect(422));

            it('day_promised_work_time is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: -1,
                    }))
                    .expect(422));

            it('day_promised_work_time should be a number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "test",
                    }))
                    .expect(422));

            it('day_promised_work_time should be a valid number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "25",
                    }))
                    .expect(422));

            it('day_promised_work_time can be a floating number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.deepPropertyVal(res.body, 'working.day_promised_work_time', 3.5);
                    }));

            it('day_real_work_time is required', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: -1,
                    }))
                    .expect(422));

            it('day_real_work_time should be a number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "test",
                    }))
                    .expect(422));

            it('day_real_work_time should be a valid number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "25",
                    }))
                    .expect(422));

            it('day_real_work_time can be a floating number', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.deepPropertyVal(res.body, 'working.day_real_work_time', 3.5);
                    }));

            for (const input of ['yes', 'no', 'don\'t know']) {
                it(`has_overtime_salary should be ${input}`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working, 'has_overtime_salary', input);
                        }));
            }
            for (const input of ['', undefined]) {
                it(`has_overtime_salary wouldn't be returned if it is "${input}"`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.notProperty(res.body.working, 'has_overtime_salary');
                        }));
            }

            it('has_overtime_salary wouldn\'t be returned if there is no such field in payload', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.notProperty(res.body.working, 'has_overtime_salary');
                    }));

            it('has_overtime_salary should be error if request others', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: '-1',
                    }))
                    .expect(422));

            for (const input of ['yes', 'no', 'don\'t know']) {
                it(`is_overtime_salary_legal should be ${input}`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working, 'is_overtime_salary_legal', input);
                        }));
            }
            for (const preInput of ['no', 'don\'t know', '-1', '', undefined]) {
                it('is_overtime_salary_legal should be error if has_overtime_salary is not yes', () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: preInput,
                            is_overtime_salary_legal: 'yes',
                        }))
                        .expect(422));
            }

            for (const input of ['', undefined]) {
                it(`is_overtime_salary_legal wouldn't be returned if it is "${input}"`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                        }));
            }

            it('is_overtime_salary_legal wouldn\'t be returned if there is no such field in payload', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                    }));

            it('is_overtime_salary_legal should be error if request others', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: 'yes',
                        is_overtime_salary_legal: '-1',
                    }))
                    .expect(422));

            for (const input of ['yes', 'no', 'don\'t know']) {
                it(`has_compensatory_dayoff should be ${input}`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working, 'has_compensatory_dayoff', input);
                        }));
            }
            for (const input of ['', undefined]) {
                it(`has_compensatory_dayoff wouldn't be returned if it is "${input}"`, () => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                        }));
            }

            it('has_compensatory_dayoff wouldn\'t be returned if there is no such field in payload', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                    }));

            it('has_compensatory_dayoff should be error if request others', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_compensatory_dayoff: '-1',
                    }))
                    .expect(422));
        });

        describe('Salary Validation Part', () => {
            it('salary_type is required', () => request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_type: -1,
                    }))
                    .expect(422));

            for (const input of ['year', 'month', 'day', 'hour']) {
                it(`salary_type should be ${input}`, () => request(app).post('/workings')
                        .send(generateSalaryRelatedPayload({
                            salary_type: input,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.deepPropertyVal(res.body.working, 'salary.type', input);
                        }));
            }

            it('salary_amount is required', () => request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_amount: -1,
                    }))
                    .expect(422));

            it('experience_in_year is required', () => request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        experience_in_year: -1,
                    }))
                    .expect(422));
        });

        describe('estimated_hourly_wage Part', () => {
            it(`should have 'estimated_hourly_wage' field, if salary_type is 'hour'`, () => request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_type: 'hour',
                        salary_amount: '100',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.propertyVal(res.body.working, 'estimated_hourly_wage', 100);
                    }));

            it(`should have 'estimated_hourly_wage' field, if salary_type is
                 'day' and has WorkingTime information`, () => request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'day',
                        salary_amount: '10000',
                        day_real_work_time: '10',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.propertyVal(res.body.working, 'estimated_hourly_wage', 1000);
                    }));

            it(`should have 'estimated_hourly_wage' field, if salary_type is
                'month' and has WorkingTime information`, () => request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'month',
                        salary_amount: '10000',
                        day_real_work_time: '10',
                        week_work_time: '40',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.closeTo(res.body.working.estimated_hourly_wage, 63, 1);
                    }));

            it(`should have 'estimated_hourly_wage' field, if salary_type is
                'year' and has WorkingTime information`, () => request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'year',
                        salary_amount: '100000',
                        day_real_work_time: '10',
                        week_work_time: '40',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.closeTo(res.body.working.estimated_hourly_wage, 52, 1);
                    }));

            for (const salary_type of ['month', 'year', 'day']) {
                it(`doc shouldn't have 'estimated_hourly_wage' field, if the calculated
                    'estimated_hourly_wage' is undefined. (salary_type is '${salary_type}'
                    but no WorkTime information)`, () => {
                    const send_request = request(app).post('/workings')
                        .send(generateAllPayload({
                            salary_type,
                            salary_amount: '10000',
                            week_work_time: -1,
                            day_real_work_time: -1,
                            day_promised_work_time: -1,
                            overtime_frequency: -1,
                        }))
                        .expect(200);

                    const test_db = send_request.then(res => res.body.working._id).then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                        assert.notProperty(result, 'estimated_hourly_wage');
                    }));
                    return Promise.all([send_request, test_db]);
                });
            }

            it(`doc shouldn't have 'estimated_hourly_wage' field, if the calculated
                'estimated_hourly_wage' is undefined. (has WorkTime information, but
                but no Salary information)`, () => {
                const send_request = request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: -1,
                        salary_amount: -1,
                        experience_in_year: -1,
                    }))
                    .expect(200);

                const test_db = send_request.then(res => res.body.working._id).then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                    assert.notProperty(result, 'estimated_hourly_wage');
                }));
                return Promise.all([send_request, test_db]);
            });
        });

        describe('Normalize Data Part', () => {
            it('job_title will be converted to UPPERCASE', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: 'GoodJob',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.propertyVal(res.body.working, 'job_title', 'GOODJOB');
                    }));

            it('company 只給 company_id 成功新增', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000001',
                        company: -1,
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    }));

            it('company 禁止錯誤的 company_id', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000000',
                        company: -1,
                    }))
                    .expect(422));

            it('company 只給 company 成功新增', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GOODJOB',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    }));

            it('company 是小寫時，轉換成大寫', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJob',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    }));

            it('只給 company，但名稱無法決定唯一公司，成功新增', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJobGreat',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.queries_count, 1);
                        assert.isUndefined(res.body.working.company.id);
                        assert.equal(res.body.working.company.name, 'GOODJOBGREAT');
                    }));

            it('data_time 是 job_ending_time_* 的組合, if is_currently_employed == "no"', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: 'no',
                        job_ending_time_year: '2015',
                        job_ending_time_month: '1',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.deepPropertyVal(res.body, 'working.data_time.year', 2015);
                        assert.deepPropertyVal(res.body, 'working.data_time.month', 1);
                    }));

            it('data_time 是 created_at 的組合, if is_currently_employed == "yes"', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: 'yes',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.deepProperty(res.body, 'working.created_at');

                        const created_at = new Date(res.body.working.created_at);

                        assert.deepPropertyVal(res.body, 'working.data_time.year', created_at.getFullYear());
                        assert.deepPropertyVal(res.body, 'working.data_time.month', created_at.getMonth() + 1);
                    }));
        });

        describe('Recommendation String Part', () => {
            before('Seed some recommendation mappings', () => db.collection('recommendations').insertMany([
                {
                    _id: new ObjectId('00000000ccd8958909a983e8'),
                    user: {
                        id: 'AAA',
                        type: 'facebook',
                    },
                },
                {
                    _id: new ObjectId('00000000ccd8958909a983e9'),
                    user: {
                        id: 'BBB',
                        type: 'facebook',
                    },
                    count: 3,
                },
            ]));

            it('should generate recommendation count=1 while recommendation_string is correct', () => {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200);

                const test_db = send_request.then(() => db.collection('recommendations').findOne({ _id: ObjectId("00000000ccd8958909a983e8") }).then((result) => {
                    assert.deepProperty(result, 'count');
                    assert.deepPropertyVal(result, 'count', 1);
                }));

                return Promise.all([send_request, test_db]);
            });

            it('should increase recommendation count while recommendation_string is correct', () => {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e9",
                    }))
                    .expect(200);

                const test_db = send_request.then(() => db.collection('recommendations').findOne({ _id: ObjectId("00000000ccd8958909a983e9") }).then((result) => {
                    assert.deepProperty(result, 'count');
                    assert.deepPropertyVal(result, 'count', 4);
                }));

                return Promise.all([send_request, test_db]);
            });

            it('should upload recommended_by info but not return recommended_by while recommendation_string is correct', () => {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.notDeepProperty(res.body.working, 'recommended_by');
                    })
                    .then(res => res.body.working._id);

                const test_db = send_request.then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                    assert.deepProperty(result, 'recommended_by');
                    assert.deepProperty(result, 'recommended_by.id');
                    assert.deepProperty(result, 'recommended_by.type');
                    assert.deepPropertyVal(result, 'recommended_by.id', 'AAA');
                    assert.deepPropertyVal(result, 'recommended_by.type', 'facebook');
                }));

                return Promise.all([send_request, test_db]);
            });

            it('should neither upload recommendation_string nor return recommendation_string while recommendation_string is correct', () => {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.notDeepProperty(res.body.working, 'recommendation_string');
                    })
                    .then(res => res.body.working._id);

                const test_db = send_request.then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                    assert.notDeepProperty(result, 'recommendation_string');
                }));

                return Promise.all([send_request, test_db]);
            });

            for (const test_string of ["00000000ccd8958909a983e7", "00000000ccd8958909a983e6", "ABCD", "1234"]) {
                it('should save recommendation_string to recommended_by', () => {
                    const send_request = request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            recommendation_string: test_string,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.notDeepProperty(res.body.working, 'recommendation_string');
                        })
                        .then(res => res.body.working._id);

                    const test_db = send_request.then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                        assert.notDeepProperty(result, 'recommendation_string');
                        assert.deepPropertyVal(result, 'recommended_by', test_string);
                    }));

                    return Promise.all([send_request, test_db]);
                });
            }

            it('it should not upload recommended_by and return recommended_by while recommendation_string is not given', () => {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({ }))
                    .expect(200)
                    .expect((res) => {
                        assert.notDeepProperty(res.body.working, 'recommended_by');
                    })
                    .then(res => res.body.working._id);

                const test_db = send_request.then(data_id => db.collection('workings').findOne({ _id: ObjectId(data_id) }).then((result) => {
                    assert.notDeepProperty(result, 'recommended_by');
                }));

                return Promise.all([send_request, test_db]);
            });
        });

        describe('Quota Check Part', () => {
            it('只能新增 5 筆資料', () => {
                const count = 5;

                const requestPromiseStack = [];
                for (let i = 0; i < count; i += 1) {
                    requestPromiseStack.push(
                        request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                company_id: '00000001',
                            }))
                            .expect(200)
                            .expect((res) => {
                                assert.equal(res.body.working.company.id, '00000001');
                                assert.equal(res.body.working.company.name, 'GOODJOB');
                            })
                    );
                }

                return Promise.all(requestPromiseStack).then(() => request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            company_id: '00000001',
                        }))
                        .expect(429))
                .then(() => {
                    sinon.assert.callCount(cachedFacebookAuthentication, 6);
                });
            });

            it('新增 2 筆資料，quries_count 會顯示 2', () => request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000001',
                    }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    })
                    .then(() => request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                company_id: '00000001',
                            }))
                            .expect(200)
                            .expect((res) => {
                                assert.equal(res.body.queries_count, 2);
                                assert.equal(res.body.working.company.id, '00000001');
                                assert.equal(res.body.working.company.name, 'GOODJOB');
                            }))
                    .then(() => {
                        sinon.assert.callCount(cachedFacebookAuthentication, 2);
                    }));
        });

        describe('Checking email field', () => {
            it('should upload emails fields while uploading worktime related data and email is given', () => {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
                        });
            });
            it('should upload emails fields while uploading salary related data and email is given', () => {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateSalaryRelatedPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
                        });
            });
            it('should upload emails fields while uploading all data and email is given', () => {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateAllPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect((res) => {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
                        });
            });
        });

        describe('status part', () => {
            it('status can be `hidden`', () =>
                request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({ status: 'hidden' }))
                    .expect(200)
                    .expect((res) => {
                        assert.equal(res.body.working.status, 'hidden');
                    }));
        });

        afterEach(() => {
            sandbox.restore();
        });

        afterEach(() => db.collection('users').remove({}));

        after('DB: 清除 workings', () => db.collection('workings').remove({}));

        after('DB: 清除 companies', () => db.collection('companies').remove({}));

        after('DB: 清除 recommendations', () => db.collection('recommendations').remove({}));
    });
});
