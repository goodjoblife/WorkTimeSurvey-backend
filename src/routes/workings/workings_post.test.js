const chai = require("chai");

const assert = chai.assert;
const request = require("supertest");
const app = require("../../app");
const { connectMongo } = require("../../models/connect");
const ObjectId = require("mongodb").ObjectId;
const { FakeUserFactory } = require("../../utils/test_helper");

function generateWorkingTimeRelatedPayload(options) {
    const opt = options || {};
    const valid = {
        job_title: "test",
        company_id: "00000001",
        is_currently_employed: "yes",
        employment_type: "full-time",
        week_work_time: "40",
        overtime_frequency: "3",
        day_promised_work_time: "8",
        day_real_work_time: "10",
        status: "published",
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
        job_title: "test",
        company_id: "00000001",
        is_currently_employed: "yes",
        employment_type: "full-time",
        salary_type: "year",
        salary_amount: "10000",
        experience_in_year: "10",
        status: "published",
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
        job_title: "test",
        company_id: "00000001",
        is_currently_employed: "yes",
        employment_type: "full-time",
        // Salary related
        salary_type: "year",
        salary_amount: "10000",
        experience_in_year: "10",
        // WorkingTime related
        week_work_time: "40",
        overtime_frequency: "3",
        day_promised_work_time: "8",
        day_real_work_time: "10",
        status: "published",
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

describe("POST /workings", () => {
    let db;
    const fake_user_factory = new FakeUserFactory();
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "mark",
        },
    };
    let fake_user_token;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        await fake_user_factory.setUp();
    });

    beforeEach("Create some users", async () => {
        fake_user_token = await fake_user_factory.create(fake_user);
    });

    afterEach(async () => {
        await fake_user_factory.tearDown();
    });

    const path = "/workings";

    before("Seed companies", () =>
        db.collection("companies").insertMany([
            {
                id: "00000001",
                name: "GOODJOB",
            },
            {
                id: "00000002",
                name: "GOODJOBGREAT",
            },
            {
                id: "00000003",
                name: "GOODJOBGREAT",
            },
        ])
    );

    describe("Authentication & Authorization Part", () => {
        it("需要回傳 401 如果沒有 access_token", () => {
            return request(app)
                .post(path)
                .expect(401);
        });

        it("需要回傳 401 如果不能 FB 登入", async () => {
            await request(app)
                .post(path)
                .set("Authorization", `Bearer invalid`)
                .expect(401);
        });
    });

    describe("generate payload", () => {
        it("generateWorkingTimeRelatedPayload", async () => {
            const res = await request(app)
                .post(path)
                .send(generateWorkingTimeRelatedPayload())
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);

            assert.equal(res.body.working.status, "published");
            assert.notProperty(res.body.working, "user_id");
            assert.notProperty(res.body.working, "recommended_by");

            const working = await db
                .collection("workings")
                .findOne({ _id: ObjectId(res.body.working._id) });

            // expected fields in db
            assert.deepEqual(working.user_id, fake_user._id);
        });

        it("generateSalaryRelatedPayload", async () => {
            const res = await request(app)
                .post(path)
                .send(generateSalaryRelatedPayload())
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.working.status, "published");
        });

        it("should update user.email & user.subscribeEmail field if email is given", async () => {
            const email = "goodjob@goodjob.life";
            await request(app)
                .post(path)
                .send({
                    ...generateSalaryRelatedPayload(),
                    email,
                })
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            const user = await db
                .collection("users")
                .findOne({ _id: fake_user._id });

            assert.equal(user.subscribeEmail, true);
            assert.equal(user.email, email);
        });
    });

    describe("Common Data Validation Part", () => {
        it("job_title is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        job_title: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("company or company_id is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company: -1,
                        company_id: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("is_currently_employed is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        is_currently_employed: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        describe('when is_currently_employed == "no"', () => {
            it("job_ending_time_year and job_ending_time_month are required", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            is_currently_employed: "no",
                            job_ending_time_year: "2015",
                            job_ending_time_month: "12",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200));

            it("job_ending_time_year are required", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            is_currently_employed: "no",
                            job_ending_time_month: "12",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));

            it("job_ending_time_month are required", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            is_currently_employed: "no",
                            job_ending_time_year: "2015",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));

            describe("job_ending_time_* should be reasonable", () => {
                it("job_ending_time_year <= this year", () => {
                    const nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    return request(app)
                        .post("/workings")
                        .send(
                            generateWorkingTimeRelatedPayload({
                                is_currently_employed: "no",
                                job_ending_time_year: nextYear
                                    .getFullYear()
                                    .toString(),
                                job_ending_time_month: "1",
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(422);
                });

                it("job_ending_time_year > this year - 10", () =>
                    request(app)
                        .post("/workings")
                        .send(
                            generateWorkingTimeRelatedPayload({
                                is_currently_employed: "no",
                                job_ending_time_year: (
                                    new Date().getFullYear() - 10
                                ).toString(),
                                job_ending_time_month: "1",
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(422));

                it("job_ending_time_* <= now", () => {
                    const now = new Date();

                    return request(app)
                        .post("/workings")
                        .send(
                            generateWorkingTimeRelatedPayload({
                                is_currently_employed: "no",
                                job_ending_time_year: now
                                    .getFullYear()
                                    .toString(),
                                job_ending_time_month: (
                                    now.getMonth() + 1
                                ).toString(),
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(200);
                });

                it("job_ending_time_* <= now", () => {
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);

                    return request(app)
                        .post("/workings")
                        .send(
                            generateWorkingTimeRelatedPayload({
                                is_currently_employed: "no",
                                job_ending_time_year: nextMonth
                                    .getFullYear()
                                    .toString(),
                                job_ending_time_month: (
                                    nextMonth.getMonth() + 1
                                ).toString(),
                            })
                        )
                        .set("Authorization", `Bearer ${fake_user_token}`)
                        .expect(422);
                });
            });
        });

        describe('when is_currently_employed == "yes"', () => {
            it("job_ending_time_year 不應該有", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            is_currently_employed: "no",
                            job_ending_time_year: "2015",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));

            it("job_ending_time_month 不應該有", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            is_currently_employed: "no",
                            job_ending_time_month: "12",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));
        });

        it("sector can be inserted", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        sector: "Hello world",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.propertyVal(res.body.working, "sector", "Hello world");
        });

        for (const input of ["male", "female", "other"]) {
            it(`gender can be ${input}`, () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            gender: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200)
                    .expect(res => {
                        assert.propertyVal(res.body.working, "gender", input);
                    }));
        }

        for (const input of [""]) {
            it(`gender should not return if "${input}"`, () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            gender: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200)
                    .expect(res => {
                        assert.notProperty(res.body.working, "gender");
                    }));
        }

        it("gender fail if invalid input", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        gender: "invalid",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        for (const input of [
            "full-time",
            "part-time",
            "intern",
            "temporary",
            "contract",
            "dispatched-labor",
        ]) {
            it(`employment_type can be ${input}`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.propertyVal(res.body.working, "employment_type", input);
            });
        }

        for (const input of [-1, "invalid"]) {
            it("employment_type is required", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            employment_type: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));
        }

        it("extra_info should be array", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        extra_info: "ABC",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("extra_info should have correct data structure", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        extra_info: ["A", "B"],
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("extra_info should be fine", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        extra_info: [
                            { key: "mail", value: "nice@goodjob.com" },
                        ],
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepEqual(res.body.working.extra_info, [
                { key: "mail", value: "nice@goodjob.com" },
            ]);
        });

        it("will get campaign_name", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        campaign_name: "engineer",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.propertyVal(res.body.working, "campaign_name", "engineer");
        });

        it("will get about_this_job", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        about_this_job: "I like my job",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.propertyVal(
                res.body.working,
                "about_this_job",
                "I like my job"
            );
        });

        it("should be 422 if email is invalid", async () => {
            await request(app)
                .post("/workings")
                .send({
                    ...generateWorkingTimeRelatedPayload(),
                    email: "goodjob@ goodjob.",
                })
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422);
        });
    });

    describe("WorkingTime Validation Part", () => {
        it("week_work_time is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        week_work_time: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("week_work_time should be a number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        week_work_time: "test",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("week_work_time should be a valid number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        week_work_time: "186",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("week_work_time can be a floating number", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        week_work_time: "30.5",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepPropertyVal(res.body, "working.week_work_time", 30.5);
        });

        it("overtime_frequency is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        overtime_frequency: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("overtime_frequency should in [0, 1, 2, 3]", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        overtime_frequency: "5",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_promised_work_time is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_promised_work_time: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_promised_work_time should be a number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "test",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_promised_work_time should be a valid number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "25",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_promised_work_time can be a floating number", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_promised_work_time: "3.5",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepPropertyVal(
                res.body,
                "working.day_promised_work_time",
                3.5
            );
        });

        it("day_real_work_time is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_real_work_time: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_real_work_time should be a number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_real_work_time: "test",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_real_work_time should be a valid number", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_real_work_time: "25",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("day_real_work_time can be a floating number", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        day_real_work_time: "3.5",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepPropertyVal(res.body, "working.day_real_work_time", 3.5);
        });

        for (const input of ["yes", "no", "don't know"]) {
            it(`has_overtime_salary should be ${input}`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.propertyVal(
                    res.body.working,
                    "has_overtime_salary",
                    input
                );
            });
        }
        for (const input of ["", undefined]) {
            it(`has_overtime_salary wouldn't be returned if it is "${input}"`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_overtime_salary: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.notProperty(res.body.working, "has_overtime_salary");
            });
        }

        it("has_overtime_salary wouldn't be returned if there is no such field in payload", async () => {
            const res = await request(app)
                .post("/workings")
                .send(generateWorkingTimeRelatedPayload({}))
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notProperty(res.body.working, "has_overtime_salary");
        });

        it("has_overtime_salary should be error if request others", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        has_overtime_salary: "-1",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        for (const input of ["yes", "no", "don't know"]) {
            it(`is_overtime_salary_legal should be ${input}`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_overtime_salary: "yes",
                            is_overtime_salary_legal: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.propertyVal(
                    res.body.working,
                    "is_overtime_salary_legal",
                    input
                );
            });
        }
        for (const preInput of ["no", "don't know", "-1", "", undefined]) {
            it("is_overtime_salary_legal should be error if has_overtime_salary is not yes", () =>
                request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_overtime_salary: preInput,
                            is_overtime_salary_legal: "yes",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(422));
        }

        for (const input of ["", undefined]) {
            it(`is_overtime_salary_legal wouldn't be returned if it is "${input}"`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_overtime_salary: "yes",
                            is_overtime_salary_legal: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.notProperty(
                    res.body.working,
                    "is_overtime_salary_legal"
                );
            });
        }

        it("is_overtime_salary_legal wouldn't be returned if there is no such field in payload", async () => {
            const res = await request(app)
                .post("/workings")
                .send(generateWorkingTimeRelatedPayload({}))
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notProperty(res.body.working, "is_overtime_salary_legal");
        });

        it("is_overtime_salary_legal should be error if request others", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        has_overtime_salary: "yes",
                        is_overtime_salary_legal: "-1",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        for (const input of ["yes", "no", "don't know"]) {
            it(`has_compensatory_dayoff should be ${input}`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.propertyVal(
                    res.body.working,
                    "has_compensatory_dayoff",
                    input
                );
            });
        }
        for (const input of ["", undefined]) {
            it(`has_compensatory_dayoff wouldn't be returned if it is "${input}"`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            has_compensatory_dayoff: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.notProperty(res.body.working, "has_compensatory_dayoff");
            });
        }

        it("has_compensatory_dayoff wouldn't be returned if there is no such field in payload", async () => {
            const res = await request(app)
                .post("/workings")
                .send(generateWorkingTimeRelatedPayload({}))
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notProperty(res.body.working, "has_compensatory_dayoff");
        });

        it("has_compensatory_dayoff should be error if request others", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        has_compensatory_dayoff: "-1",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));
    });

    describe("Salary Validation Part", () => {
        it("salary_type is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateSalaryRelatedPayload({
                        salary_type: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        for (const input of ["year", "month", "day", "hour"]) {
            it(`salary_type should be ${input}`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateSalaryRelatedPayload({
                            salary_type: input,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.deepPropertyVal(res.body.working, "salary.type", input);
            });
        }

        it("salary_amount is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateSalaryRelatedPayload({
                        salary_amount: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("experience_in_year is required", () =>
            request(app)
                .post("/workings")
                .send(
                    generateSalaryRelatedPayload({
                        experience_in_year: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));
    });

    describe("estimated_hourly_wage Part", () => {
        it(`should have 'estimated_hourly_wage' field, if salary_type is 'hour'`, async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateSalaryRelatedPayload({
                        salary_type: "hour",
                        salary_amount: "100",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.property(res.body.working, "estimated_hourly_wage");
            assert.propertyVal(res.body.working, "estimated_hourly_wage", 100);
        });

        it(`should have 'estimated_hourly_wage' field, if salary_type is
                 'day' and has WorkingTime information`, async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateAllPayload({
                        salary_type: "day",
                        salary_amount: "10000",
                        day_real_work_time: "10",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.property(res.body.working, "estimated_hourly_wage");
            assert.propertyVal(res.body.working, "estimated_hourly_wage", 1000);
        });

        it(`should have 'estimated_hourly_wage' field, if salary_type is
                'month' and has WorkingTime information`, async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateAllPayload({
                        salary_type: "month",
                        salary_amount: "10000",
                        day_real_work_time: "10",
                        week_work_time: "40",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.property(res.body.working, "estimated_hourly_wage");
            assert.closeTo(res.body.working.estimated_hourly_wage, 63, 1);
        });

        it(`should have 'estimated_hourly_wage' field, if salary_type is
                'year' and has WorkingTime information`, async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateAllPayload({
                        salary_type: "year",
                        salary_amount: "100000",
                        day_real_work_time: "10",
                        week_work_time: "40",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.property(res.body.working, "estimated_hourly_wage");
            assert.closeTo(res.body.working.estimated_hourly_wage, 52, 1);
        });

        for (const salary_type of ["month", "year", "day"]) {
            it(`doc shouldn't have 'estimated_hourly_wage' field, if the calculated
                    'estimated_hourly_wage' is undefined. (salary_type is '${salary_type}'
                    but no WorkTime information)`, async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateAllPayload({
                            salary_type,
                            salary_amount: "10000",
                            week_work_time: -1,
                            day_real_work_time: -1,
                            day_promised_work_time: -1,
                            overtime_frequency: -1,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                const data_id = res.body.working._id;
                const result = await db
                    .collection("workings")
                    .findOne({ _id: ObjectId(data_id) });
                assert.notProperty(result, "estimated_hourly_wage");
            });
        }

        it(`doc shouldn't have 'estimated_hourly_wage' field, if the calculated
                'estimated_hourly_wage' is undefined. (has WorkTime information, but
                but no Salary information)`, async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateAllPayload({
                        salary_type: -1,
                        salary_amount: -1,
                        experience_in_year: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            const data_id = res.body.working._id;
            const result = await db
                .collection("workings")
                .findOne({ _id: ObjectId(data_id) });
            assert.notProperty(result, "estimated_hourly_wage");
        });
    });

    describe("Normalize Data Part", () => {
        it("job_title will be converted to UPPERCASE", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        job_title: "GoodJob",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.propertyVal(res.body.working, "job_title", "GOODJOB");
        });

        it("company 只給 company_id 成功新增", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: "00000001",
                        company: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.queries_count, 1);
            assert.equal(res.body.working.company.id, "00000001");
            assert.equal(res.body.working.company.name, "GOODJOB");
        });

        it("company 禁止錯誤的 company_id", () =>
            request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: "00000000",
                        company: -1,
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(422));

        it("company 只給 company 成功新增", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: "GOODJOB",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.queries_count, 1);
            assert.equal(res.body.working.company.id, "00000001");
            assert.equal(res.body.working.company.name, "GOODJOB");
        });

        it("company 是小寫時，轉換成大寫", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: "GoodJob",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.queries_count, 1);
            assert.equal(res.body.working.company.id, "00000001");
            assert.equal(res.body.working.company.name, "GOODJOB");
        });

        it("只給 company，但名稱無法決定唯一公司，成功新增", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: -1,
                        company: "GoodJobGreat",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.queries_count, 1);
            assert.isUndefined(res.body.working.company.id);
            assert.equal(res.body.working.company.name, "GOODJOBGREAT");
        });

        it('data_time 是 job_ending_time_* 的組合, if is_currently_employed == "no"', async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        is_currently_employed: "no",
                        job_ending_time_year: "2015",
                        job_ending_time_month: "1",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepPropertyVal(res.body, "working.data_time.year", 2015);
            assert.deepPropertyVal(res.body, "working.data_time.month", 1);
        });

        it('data_time 是 created_at 的組合, if is_currently_employed == "yes"', async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        is_currently_employed: "yes",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.deepProperty(res.body, "working.created_at");

            const created_at = new Date(res.body.working.created_at);

            assert.deepPropertyVal(
                res.body,
                "working.data_time.year",
                created_at.getFullYear()
            );
            assert.deepPropertyVal(
                res.body,
                "working.data_time.month",
                created_at.getMonth() + 1
            );
        });
    });

    describe("Recommendation String Part", () => {
        before("Seed some recommendation mappings", () =>
            db.collection("recommendations").insertMany([
                {
                    _id: new ObjectId("00000000ccd8958909a983e8"),
                    user: {
                        id: "AAA",
                        type: "facebook",
                    },
                },
                {
                    _id: new ObjectId("00000000ccd8958909a983e9"),
                    user: {
                        id: "BBB",
                        type: "facebook",
                    },
                    count: 3,
                },
            ])
        );

        it("should generate recommendation count=1 while recommendation_string is correct", async () => {
            await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);

            const result = await db
                .collection("recommendations")
                .findOne({ _id: ObjectId("00000000ccd8958909a983e8") });
            assert.deepProperty(result, "count");
            assert.deepPropertyVal(result, "count", 1);
        });

        it("should increase recommendation count while recommendation_string is correct", async () => {
            await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e9",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);

            const result = await db
                .collection("recommendations")
                .findOne({ _id: ObjectId("00000000ccd8958909a983e9") });
            assert.deepProperty(result, "count");
            assert.deepPropertyVal(result, "count", 4);
        });

        it("should upload recommended_by info but not return recommended_by while recommendation_string is correct", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notDeepProperty(res.body.working, "recommended_by");
            const data_id = res.body.working._id;
            const result = await db
                .collection("workings")
                .findOne({ _id: ObjectId(data_id) });
            assert.deepProperty(result, "recommended_by");
            assert.deepProperty(result, "recommended_by.id");
            assert.deepProperty(result, "recommended_by.type");
            assert.deepPropertyVal(result, "recommended_by.id", "AAA");
            assert.deepPropertyVal(result, "recommended_by.type", "facebook");
        });

        it("should neither upload recommendation_string nor return recommendation_string while recommendation_string is correct", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        recommendation_string: "00000000ccd8958909a983e8",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notDeepProperty(res.body.working, "recommendation_string");
            const data_id = res.body.working._id;
            const result = await db
                .collection("workings")
                .findOne({ _id: ObjectId(data_id) });
            assert.notDeepProperty(result, "recommendation_string");
        });

        for (const test_string of [
            "00000000ccd8958909a983e7",
            "00000000ccd8958909a983e6",
            "ABCD",
            "1234",
        ]) {
            it("should save recommendation_string to recommended_by", async () => {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            recommendation_string: test_string,
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.notDeepProperty(
                    res.body.working,
                    "recommendation_string"
                );

                const data_id = res.body.working._id;
                const result = await db
                    .collection("workings")
                    .findOne({ _id: ObjectId(data_id) });
                assert.notDeepProperty(result, "recommendation_string");
                assert.deepPropertyVal(result, "recommended_by", test_string);
            });
        }

        it("it should not upload recommended_by and return recommended_by while recommendation_string is not given", async () => {
            const res = await request(app)
                .post("/workings")
                .send(generateWorkingTimeRelatedPayload({}))
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.notDeepProperty(res.body.working, "recommended_by");

            const data_id = res.body.working._id;
            const result = await db
                .collection("workings")
                .findOne({ _id: ObjectId(data_id) });
            assert.notDeepProperty(result, "recommended_by");
        });
    });

    describe("Quota Check Part", () => {
        it("只能新增 5 筆資料", async () => {
            const count = 5;
            for (let i = 0; i < count; i += 1) {
                const res = await request(app)
                    .post("/workings")
                    .send(
                        generateWorkingTimeRelatedPayload({
                            company_id: "00000001",
                        })
                    )
                    .set("Authorization", `Bearer ${fake_user_token}`)
                    .expect(200);
                assert.equal(res.body.working.company.id, "00000001");
                assert.equal(res.body.working.company.name, "GOODJOB");
            }

            await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: "00000001",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(429);
        });

        it("新增 2 筆資料，quries_count 會顯示 2", async () => {
            const res = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: "00000001",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.queries_count, 1);
            assert.equal(res.body.working.company.id, "00000001");
            assert.equal(res.body.working.company.name, "GOODJOB");

            const res2 = await request(app)
                .post("/workings")
                .send(
                    generateWorkingTimeRelatedPayload({
                        company_id: "00000001",
                    })
                )
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res2.body.queries_count, 2);
            assert.equal(res2.body.working.company.id, "00000001");
            assert.equal(res2.body.working.company.name, "GOODJOB");
        });
    });

    describe("status part", () => {
        it("status can be `hidden`", async () => {
            const res = await request(app)
                .post("/workings")
                .send(generateWorkingTimeRelatedPayload({ status: "hidden" }))
                .set("Authorization", `Bearer ${fake_user_token}`)
                .expect(200);
            assert.equal(res.body.working.status, "hidden");
        });
    });

    after(async () => {
        await db.collection("workings").deleteMany({});
        await db.collection("companies").deleteMany({});
        await db.collection("recommendations").deleteMany({});
    });
});
