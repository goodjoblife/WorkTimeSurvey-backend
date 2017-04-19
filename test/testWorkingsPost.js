const chai = require('chai');
const assert = chai.assert;
const request = require('supertest');
const app = require('../app');
const MongoClient = require('mongodb').MongoClient;
const nock = require('nock');
const ObjectId = require('mongodb').ObjectId;

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
            it('需要回傳 401 如果沒有 access_token', function() {
                return request(app).post('/workings')
                    .expect(401);
            });

            it('需要回傳 401 如果 access_token 為空', function() {
                return request(app).post('/workings')
                    .send({
                        access_token: "",
                    })
                    .expect(401);
            });

            it('需要回傳 401 如果不能 FB 登入', function() {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .query(true)
                    .reply(200, {error: 'error'});

                return request(app).post('/workings')
                    .send({
                        access_token: 'random',
                    })
                    .expect(401);
            });
        });

        describe('generate payload', function() {
            it('generateWorkingTimeRelatedPayload', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload())
                    .expect(200);
            });

            it('generateSalaryRelatedPayload', function() {
                return request(app).post('/workings')
                    .send(generateSalaryRelatedPayload())
                    .expect(200);
            });
        });

        describe('Common Data Validation Part', function() {
            it('job_title is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: -1,
                    }))
                    .expect(422);
            });

            it('company or company_id is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company: -1,
                        company_id: -1,
                    }))
                    .expect(422);
            });

            it('is_currently_employed is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: -1,
                    }))
                    .expect(422);
            });

            describe('when is_currently_employed == "no"', function() {
                it('job_ending_time_year and job_ending_time_month are required', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                            job_ending_time_month: '12',
                        }))
                        .expect(200);
                });

                it('job_ending_time_year are required', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_month: '12',
                        }))
                        .expect(422);
                });

                it('job_ending_time_month are required', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                        }))
                        .expect(422);
                });

                describe('job_ending_time_* should be reasonable', function() {
                    it('job_ending_time_year <= this year', function() {
                        let nextYear = new Date();
                        nextYear.setFullYear(nextYear.getFullYear() + 1);
                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: nextYear.getFullYear().toString(),
                                job_ending_time_month: '1',
                            }))
                            .expect(422);
                    });

                    it('job_ending_time_year > this year - 10', function() {
                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: ((new Date()).getFullYear() - 10).toString(),
                                job_ending_time_month: '1',
                            }))
                            .expect(422);
                    });

                    it('job_ending_time_* <= now', function() {
                        let now = new Date();

                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                is_currently_employed: 'no',
                                job_ending_time_year: now.getFullYear().toString(),
                                job_ending_time_month: (now.getMonth() + 1).toString(),
                            }))
                            .expect(200);
                    });

                    it('job_ending_time_* <= now', function() {
                        let nextMonth = new Date();
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

            describe('when is_currently_employed == "yes"', function() {
                it('job_ending_time_year 不應該有', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_year: '2015',
                        }))
                        .expect(422);
                });

                it('job_ending_time_month 不應該有', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            is_currently_employed: 'no',
                            job_ending_time_month: '12',
                        }))
                        .expect(422);
                });
            });

            it('sector can be inserted', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        sector: 'Hello world',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body.working, 'sector', 'Hello world');
                    });
            });

            for (let input of ['male', 'female', 'other']) {
                it(`gender can be ${input}`, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            gender: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'gender', input);
                        });
                });
            }

            for (let input of ['']) {
                it(`gender should not return if "${input}"`, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            gender: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'gender');
                        });
                });
            }

            it('gender fail if invalid input', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        gender: 'invalid',
                    }))
                    .expect(422);
            });

            for (let input of ["full-time", "part-time", "intern", "temporary", "contract", "dispatched-labor"]) {
                it(`employment_type can be ${input}`, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'employment_type', input);
                        });
                });
            }

            for (let input of [-1, 'invalid']) {
                it('employment_type is required', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        }))
                        .expect(422);
                });
            }
        });

        describe('WorkingTime Validation Part', function() {
            it('week_work_time is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: -1,
                    }))
                    .expect(422);
            });

            it('week_work_time should be a number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "test",
                    }))
                    .expect(422);
            });

            it('week_work_time should be a valid number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "186",
                    }))
                    .expect(422);
            });

            it('week_work_time can be a floating number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        week_work_time: "30.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.week_work_time', 30.5);
                    });
            });

            it('overtime_frequency is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: -1,
                    }))
                    .expect(422);
            });

            it('overtime_frequency should in [0, 1, 2, 3]', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        overtime_frequency: '5',
                    }))
                    .expect(422);
            });

            it('day_promised_work_time is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: -1,
                    }))
                    .expect(422);
            });

            it('day_promised_work_time should be a number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "test",
                    }))
                    .expect(422);
            });

            it('day_promised_work_time should be a valid number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "25",
                    }))
                    .expect(422);
            });

            it('day_promised_work_time can be a floating number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_promised_work_time', 3.5);
                    });
            });

            it('day_real_work_time is required', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: -1,
                    }))
                    .expect(422);
            });

            it('day_real_work_time should be a number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "test",
                    }))
                    .expect(422);
            });

            it('day_real_work_time should be a valid number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "25",
                    }))
                    .expect(422);
            });

            it('day_real_work_time can be a floating number', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        day_real_work_time: "3.5",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.day_real_work_time', 3.5);
                    });
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('has_overtime_salary should be ' + input, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'has_overtime_salary', input);
                        });
                });
            }
            for (let input of ['', undefined]) {
                it('has_overtime_salary wouldn\'t be returned if it is "' + input + '"', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'has_overtime_salary');
                        });
                });
            }

            it('has_overtime_salary wouldn\'t be returned if there is no such field in payload', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'has_overtime_salary');
                    });
            });

            it('has_overtime_salary should be error if request others', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: '-1',
                    }))
                    .expect(422);
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('is_overtime_salary_legal should be ' + input, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'is_overtime_salary_legal', input);
                        });
                });
            }
            for (let preInput of ['no', 'don\'t know', '-1', '', undefined]) {
                it('is_overtime_salary_legal should be error if has_overtime_salary is not yes', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: preInput,
                            is_overtime_salary_legal: 'yes',
                        }))
                        .expect(422);
                });
            }

            for (let input of ['', undefined]) {
                it('is_overtime_salary_legal wouldn\'t be returned if it is "' + input + '"', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_overtime_salary: 'yes',
                            is_overtime_salary_legal: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                        });
                });
            }

            it('is_overtime_salary_legal wouldn\'t be returned if there is no such field in payload', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'is_overtime_salary_legal');
                    });
            });

            it('is_overtime_salary_legal should be error if request others', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_overtime_salary: 'yes',
                        is_overtime_salary_legal: '-1',
                    }))
                    .expect(422);
            });

            for (let input of ['yes', 'no', 'don\'t know']) {
                it('has_compensatory_dayoff should be ' + input, function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working, 'has_compensatory_dayoff', input);
                        });
                });
            }
            for (let input of ['', undefined]) {
                it('has_compensatory_dayoff wouldn\'t be returned if it is "' + input + '"', function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                        });
                });
            }

            it('has_compensatory_dayoff wouldn\'t be returned if there is no such field in payload', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notProperty(res.body.working, 'has_compensatory_dayoff');
                    });
            });

            it('has_compensatory_dayoff should be error if request others', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        has_compensatory_dayoff: '-1',
                    }))
                    .expect(422);
            });
        });

        describe('Salary Validation Part', function() {
            it('salary_type is required', function() {
                return request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_type: -1,
                    }))
                    .expect(422);
            });

            for (let input of ['year', 'month', 'day', 'hour']) {
                it(`salary_type should be ${input}`, function() {
                    return request(app).post('/workings')
                        .send(generateSalaryRelatedPayload({
                            salary_type: input,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.deepPropertyVal(res.body.working, 'salary.type', input);
                        });
                });
            }

            it(`if salary_type is 'hour' should have 'estimated_hourly_wage' field`, function() {
                return request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_type: 'hour',
                        salary_amount: '100',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.propertyVal(res.body.working, 'estimated_hourly_wage', 100);
                    });
            });

            it(`if salary_type is 'day' and has WorkingTime information
                should have 'estimated_hourly_wage' field`, function() {
                return request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'day',
                        salary_amount: '10000',
                        day_real_work_time: '10',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.propertyVal(res.body.working, 'estimated_hourly_wage', 1000);
                    });
            });

            it(`if salary_type is 'month' and has WorkingTime information
                should have 'estimated_hourly_wage' field`, function() {
                return request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'month',
                        salary_amount: '10000',
                        day_real_work_time: '10',
                        week_work_time: '40',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.closeTo(res.body.working.estimated_hourly_wage, 63, 1);
                    });
            });

            it(`if salary_type is 'year' and has WorkingTime information
                should have 'estimated_hourly_wage' field`, function() {
                return request(app).post('/workings')
                    .send(generateAllPayload({
                        salary_type: 'year',
                        salary_amount: '100000',
                        day_real_work_time: '10',
                        week_work_time: '40',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.property(res.body.working, 'estimated_hourly_wage');
                        assert.closeTo(res.body.working.estimated_hourly_wage, 52, 1);
                    });
            });

            it('salary_amount is required', function() {
                return request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        salary_amount: -1,
                    }))
                    .expect(422);
            });

            it('experience_in_year is required', function() {
                return request(app).post('/workings')
                    .send(generateSalaryRelatedPayload({
                        experience_in_year: -1,
                    }))
                    .expect(422);
            });
        });

        describe('Normalize Data Part', function() {
            it('job_title will be converted to UPPERCASE', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        job_title: 'GoodJob',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.propertyVal(res.body.working, 'job_title', 'GOODJOB');
                    });
            });

            it('company 只給 company_id 成功新增', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000001',
                        company: -1,
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    });
            });

            it('company 禁止錯誤的 company_id', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000000',
                        company: -1,
                    }))
                    .expect(422);
            });

            it('company 只給 company 成功新增', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GOODJOB',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    });
            });

            it('company 是小寫時，轉換成大寫', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJob',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    });
            });

            it('只給 company，但名稱無法決定唯一公司，成功新增', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: 'GoodJobGreat',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.isUndefined(res.body.working.company.id);
                        assert.equal(res.body.working.company.name, 'GOODJOBGREAT');
                    });
            });

            it('data_time 是 job_ending_time_* 的組合, if is_currently_employed == "no"', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: 'no',
                        job_ending_time_year: '2015',
                        job_ending_time_month: '1',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepPropertyVal(res.body, 'working.data_time.year', 2015);
                        assert.deepPropertyVal(res.body, 'working.data_time.month', 1);
                    });
            });

            it('data_time 是 created_at 的組合, if is_currently_employed == "yes"', function() {
                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        is_currently_employed: 'yes',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.deepProperty(res.body, 'working.created_at');

                        const created_at = new Date(res.body.working.created_at);

                        assert.deepPropertyVal(res.body, 'working.data_time.year', created_at.getFullYear());
                        assert.deepPropertyVal(res.body, 'working.data_time.month', created_at.getMonth() + 1);
                    });
            });
        });

        describe('Recommendation String Part', function() {
            before('Seed some recommendation mappings', function() {
                return db.collection('recommendations').insertMany([
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
                ]);
            });

            it('should generate recommendation count=1 while recommendation_string is correct', function() {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200);

                const test_db = send_request.then(() => {
                    return db.collection('recommendations').findOne({_id: ObjectId("00000000ccd8958909a983e8")}).then(result => {
                        assert.deepProperty(result, 'count');
                        assert.deepPropertyVal(result, 'count', 1);
                    });
                });

                return Promise.all([send_request, test_db]);
            });

            it('should increase recommendation count while recommendation_string is correct', function() {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e9",
                    }))
                    .expect(200);

                const test_db = send_request.then(() => {
                    return db.collection('recommendations').findOne({_id: ObjectId("00000000ccd8958909a983e9")}).then(result => {
                        assert.deepProperty(result, 'count');
                        assert.deepPropertyVal(result, 'count', 4);
                    });
                });

                return Promise.all([send_request, test_db]);
            });

            it('should upload recommended_by info but not return recommended_by while recommendation_string is correct', function() {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notDeepProperty(res.body.working, 'recommended_by');
                    })
                    .then(function(res) {
                        return res.body.working._id;
                    });

                const test_db = send_request.then((data_id) => {
                    return db.collection('workings').findOne({_id: ObjectId(data_id)}).then(result => {
                        assert.deepProperty(result, 'recommended_by');
                        assert.deepProperty(result, 'recommended_by.id');
                        assert.deepProperty(result, 'recommended_by.type');
                        assert.deepPropertyVal(result, 'recommended_by.id', 'AAA');
                        assert.deepPropertyVal(result, 'recommended_by.type', 'facebook');
                    });
                });

                return Promise.all([send_request, test_db]);
            });

            it('should neither upload recommendation_string nor return recommendation_string while recommendation_string is correct', function() {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notDeepProperty(res.body.working, 'recommendation_string');
                    })
                    .then(function(res) {
                        return res.body.working._id;
                    });

                const test_db = send_request.then((data_id) => {
                    return db.collection('workings').findOne({_id: ObjectId(data_id)}).then(result => {
                        assert.notDeepProperty(result, 'recommendation_string');
                    });
                });

                return Promise.all([send_request, test_db]);
            });

            for (let test_string of ["00000000ccd8958909a983e7", "00000000ccd8958909a983e6", "ABCD", "1234"]) {
                it('should save recommendation_string to recommended_by', function() {
                    const send_request = request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            recommendation_string: test_string,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.notDeepProperty(res.body.working, 'recommendation_string');
                        })
                        .then(function(res) {
                            return res.body.working._id;
                        });

                    const test_db = send_request.then((data_id) => {
                        return db.collection('workings').findOne({_id: ObjectId(data_id)}).then(result => {
                            assert.notDeepProperty(result, 'recommendation_string');
                            assert.deepPropertyVal(result, 'recommended_by', test_string);
                        });
                    });

                    return Promise.all([send_request, test_db]);
                });
            }

            it('it should not upload recommended_by and return recommended_by while recommendation_string is not given', function() {
                const send_request = request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({ }))
                    .expect(200)
                    .expect(function(res) {
                        assert.notDeepProperty(res.body.working, 'recommended_by');
                    })
                    .then(function(res) {
                        return res.body.working._id;
                    });

                const test_db = send_request.then((data_id) => {
                    return db.collection('workings').findOne({_id: ObjectId(data_id)}).then(result => {
                        assert.notDeepProperty(result, 'recommended_by');
                    });
                });

                return Promise.all([send_request, test_db]);
            });
        });

        describe('Quota Check Part', function() {
            it('只能新增 5 筆資料', function() {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .times(6)
                    .query(true)
                    .reply(200, {id: '-1', name: 'test'});

                const count = 5;

                var requestPromiseStack = [];
                for (let i = 0; i < count; i++) {
                    requestPromiseStack.push(
                        request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                company_id: '00000001',
                            }))
                            .expect(200)
                            .expect(function(res) {
                                assert.equal(res.body.working.company.id, '00000001');
                                assert.equal(res.body.working.company.name, 'GOODJOB');
                            })
                    );
                }

                return Promise.all(requestPromiseStack).then(function() {
                    return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            company_id: '00000001',
                        }))
                        .expect(429);
                });
            });

            it('新增 2 筆資料，quries_count 會顯示 2', function() {
                nock.cleanAll();
                nock('https://graph.facebook.com:443')
                    .get('/v2.6/me')
                    .times(2)
                    .query(true)
                    .reply(200, {id: '-1', name: 'test'});

                return request(app).post('/workings')
                    .send(generateWorkingTimeRelatedPayload({
                        company_id: '00000001',
                    }))
                    .expect(200)
                    .expect(function(res) {
                        assert.equal(res.body.queries_count, 1);
                        assert.equal(res.body.working.company.id, '00000001');
                        assert.equal(res.body.working.company.name, 'GOODJOB');
                    })
                    .then(function() {
                        return request(app).post('/workings')
                            .send(generateWorkingTimeRelatedPayload({
                                company_id: '00000001',
                            }))
                            .expect(200)
                            .expect(function(res) {
                                assert.equal(res.body.queries_count, 2);
                                assert.equal(res.body.working.company.id, '00000001');
                                assert.equal(res.body.working.company.name, 'GOODJOB');
                            });
                    });
            });
        });

        describe('Checking email field', function() {
            it('should upload emails fields while uploading worktime related data and email is given', function() {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateWorkingTimeRelatedPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
                        });
            });
            it('should upload emails fields while uploading salary related data and email is given', function() {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateSalaryRelatedPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
                        });
            });
            it('should upload emails fields while uploading all data and email is given', function() {
                const test_email = "test12345@gmail.com";
                return request(app).post('/workings')
                        .send(generateAllPayload({
                            email: test_email,
                        }))
                        .expect(200)
                        .expect(function(res) {
                            assert.propertyVal(res.body.working.author, 'email', test_email);
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

        after('DB: 清除 recommendations', function() {
            return db.collection('recommendations').remove({});
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

function generateAllPayload(opt) {
    opt = opt || {};
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
