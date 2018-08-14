const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const assert = chai.assert;
const request = require("supertest");
const app = require("../../app");
const { connectMongo } = require("../../models/connect");
const ObjectId = require("mongodb").ObjectId;
const sinon = require("sinon");
const authentication = require("../../libs/authentication");

function generateInterviewExperiencePayload(options) {
    const opt = options || {};
    const valid = {
        company_query: "00000001",
        region: "臺北市",
        job_title: "job_title_example",
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
            type: "year",
            amount: 10000,
        },
        overall_rating: 5,
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
    payload.access_token = "fakeaccesstoken";
    return payload;
}

describe("experiences 面試和工作經驗資訊", () => {
    let db;
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "markLin",
        },
    };

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("POST /interview_experiences", () => {
        let sandbox;
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

        beforeEach("Stub cachedFacebookAuthentication", () => {
            sandbox = sinon.sandbox.create();
            sandbox
                .stub(authentication, "cachedFacebookAuthentication")
                .withArgs(
                    sinon.match.object,
                    sinon.match.object,
                    "fakeaccesstoken"
                )
                .resolves(fake_user);
        });

        it("should success", async () => {
            const res = await request(app)
                .post("/interview_experiences")
                .send(generateInterviewExperiencePayload())
                .expect(200);

            const experience = await db
                .collection("experiences")
                .findOne({ _id: ObjectId(res.body.experience._id) });

            // expected fields in db
            assert.equal(experience.type, "interview");
            assert.deepEqual(experience.author_id, fake_user._id);
            assert.deepEqual(experience.company, {
                id: "00000001",
                name: "GOODJOB",
            });
            assert.equal(experience.region, "臺北市");
            assert.equal(experience.job_title, "JOB_TITLE_EXAMPLE");
            assert.equal(experience.title, "title_example");
            assert.deepEqual(experience.sections, [
                {
                    subtitle: "subtitle1",
                    content: "content1",
                },
            ]);
            assert.equal(experience.experience_in_year, 10);
            assert.equal(experience.education, "大學");
            assert.deepEqual(experience.interview_time, {
                year: 2017,
                month: 3,
            });
            assert.deepEqual(experience.interview_qas, [
                { question: "qas1", answer: "ans1" },
            ]);
            assert.deepEqual(experience.interview_result, "up");
            assert.deepEqual(experience.interview_sensitive_questions, []);
            assert.deepEqual(experience.salary, {
                type: "year",
                amount: 10000,
            });
            assert.deepEqual(experience.overall_rating, 5);
            assert.deepEqual(experience.like_count, 0);
            assert.deepEqual(experience.reply_count, 0);
            assert.deepEqual(experience.report_count, 0);
            assert.deepEqual(experience.status, "published");
            assert.property(experience, "created_at");

            assert.equal(experience.is_archive, false);
            assert.equal(experience.archive_reason, "");
        });

        describe("Common Data Validation Part", () => {
            it("company_query or company_id is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            company_query: -1,
                            company_id: -1,
                        })
                    )
                    .expect(422));

            it("region is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            region: -1,
                        })
                    )
                    .expect(422));

            it("job_title is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            job_title: -1,
                        })
                    )
                    .expect(422));

            it("title is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            title: -1,
                        })
                    )
                    .expect(422));

            it("region is illegal Field, expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            region: "你好市",
                        })
                    )
                    .expect(422));

            it("title of word is more than 25 char , expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            title: new Array(30).join("今"),
                        })
                    )
                    .expect(422));

            it("sections is empty, expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: null,
                        })
                    )
                    .expect(422));

            it("sections is not array, expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: "abcdef",
                        })
                    )
                    .expect(422));

            it("subsection of title and content is empty, expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: [
                                {
                                    subtitle: null,
                                    content: null,
                                },
                            ],
                        })
                    )
                    .expect(422));

            it("subsection of title is undefined, expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: [
                                {
                                    subtitle: undefined,
                                    content: "I am content",
                                },
                            ],
                        })
                    )
                    .expect(422));

            it("subsection of title is null, expected return 200", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: [
                                {
                                    subtitle: null,
                                    content: "I am content",
                                },
                            ],
                        })
                    )
                    .expect(200));

            it("subtitle of word is more than 25 char, expected return 422", () => {
                const words = new Array(40).join("慘");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            sections: [
                                { subtitle: words, content: "喝喝面試官" },
                            ],
                        })
                    )
                    .expect(422);
            });

            it("subcontent of word is more then 5000 char, expected return 422", () => {
                const sendData = generateInterviewExperiencePayload();
                const words = new Array(6000).join("好");
                sendData.sections[0].content = words;
                return request(app)
                    .post("/interview_experiences")
                    .send(sendData)
                    .expect(422);
            });

            it("education is illegal , expected return 422", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            education: "無業遊名",
                        })
                    )
                    .expect(422));
        });

        describe("Interview Validation Part", () => {
            it("interview_time is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_time: -1,
                        })
                    )
                    .expect(422));

            it("interview_time_year is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_time: {
                                month: 3,
                            },
                        })
                    )
                    .expect(422));

            it("interview_time_month is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_time: {
                                year: 2017,
                            },
                        })
                    )
                    .expect(422));

            it("interview_qas is array", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas: {},
                        })
                    )
                    .expect(422));

            it("interview_qas of question and answer  is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas: [
                                {
                                    question: undefined,
                                    answer: undefined,
                                },
                            ],
                        })
                    )
                    .expect(422));

            it("number of question word  is less than 250 char", () => {
                const question = new Array(300).join("問");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas: [
                                {
                                    question,
                                    answer: "我想寫個慘字",
                                },
                            ],
                        })
                    )
                    .expect(422);
            });

            it("number of answer word  is less than 5000 char", () => {
                const answer = new Array(5500).join("問");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas: [
                                {
                                    question: "我還是想寫個慘字",
                                    answer,
                                },
                            ],
                        })
                    )
                    .expect(422);
            });

            it("should return status 200", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas: [
                                {
                                    question: "我還是想寫個慘字",
                                    answer: "慘字",
                                },
                                {
                                    question: "我還是想寫個慘字",
                                    answer: null,
                                },
                                {
                                    question: "我還是想寫個慘字",
                                    answer: undefined,
                                },
                            ],
                        })
                    )
                    .expect(200)
                    .then(res => {
                        const id = res.body.experience._id.toString();
                        return request(app).get(`/experiences/${id}`);
                    })
                    .then(res => {
                        const experience = res.body;
                        assert.lengthOf(experience.interview_qas, 3);
                        assert.property(experience.interview_qas[0], "answer");
                        assert.notProperty(
                            experience.interview_qas[1],
                            "answer",
                            "Because the input of answer is null"
                        );
                        assert.notProperty(
                            experience.interview_qas[2],
                            "answer",
                            "Because the input of answer is undefined"
                        );
                    }));

            it("number of question count  is less than 30", () => {
                const qas = { question: "慘啊", answer: "給我寫個慘" };
                const interview_qas = [];
                for (let i = 0; i <= 40; i += 1) {
                    interview_qas.push(qas);
                }
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_qas,
                        })
                    )
                    .expect(422);
            });

            it("number of interview_result word  is less than 10", () => {
                const interview_result = new Array(20).join("慘");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_result,
                        })
                    )
                    .expect(422);
            });

            it("interview_sensitive_questions is array", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_sensitive_questions: {},
                        })
                    )
                    .expect(422));

            it("interview_sensitive_questions is required non empty string", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_sensitive_questions: ["", ""],
                        })
                    )
                    .expect(422));

            it("number of interview_sensitive_questions count is less than 20", () => {
                const qs = new Array(30).join("慘");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_sensitive_questions: [qs, qs],
                        })
                    )
                    .expect(422);
            });

            it("number of interview_sensitive_questions count is less than 20", () => {
                const qs = new Array(30).join("慘");
                return request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_sensitive_questions: [qs, qs],
                        })
                    )
                    .expect(422);
            });

            it('salary type should in ["year","month","day","hour"]', () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            salary: {
                                type: "hooooo",
                                amount: 10000,
                            },
                        })
                    )
                    .expect(422));

            it("salary amount is number required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            salary: {
                                type: "year",
                                amount: "hohohoho",
                            },
                        })
                    )
                    .expect(422));

            it("salary amount should be positive number", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            salary: {
                                type: "year",
                                amount: -1000,
                            },
                        })
                    )
                    .expect(422));

            describe("interview_time should be reasonable", () => {
                it("interview_time_year sould be number", () =>
                    request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: "2017",
                                    month: 3,
                                },
                            })
                        )
                        .expect(422));

                it("interview_time_month sould be number", () =>
                    request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: 2017,
                                    month: "3",
                                },
                            })
                        )
                        .expect(422));

                it("interview_time_year <= this year", () => {
                    const nextYear = new Date();
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    return request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: nextYear.getFullYear(),
                                    month: 3,
                                },
                            })
                        )
                        .expect(422);
                });

                it("interview_time_year > this year - 10", () =>
                    request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: new Date().getFullYear() - 10,
                                    month: 3,
                                },
                            })
                        )
                        .expect(422));

                it("interview_time_month should be 1~12", () =>
                    request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: 2017,
                                    month: 13,
                                },
                            })
                        )
                        .expect(422));

                it("interview_time <= now", () => {
                    const now = new Date();

                    return request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                interview_time: {
                                    year: now.getFullYear(),
                                    month: now.getMonth() + 2,
                                },
                            })
                        )
                        .expect(422);
                });
            });

            it("interview_result is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_result: -1,
                        })
                    )
                    .expect(422));

            it("interview_result could not be a string length > 10", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_result: "12345678901",
                        })
                    )
                    .expect(422));

            it("interview_result could not be a string length < 1", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_result: "",
                        })
                    )
                    .expect(422));

            it("interview_result should be a string length 1~10", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            interview_result: "12345",
                        })
                    )
                    .expect(200));

            it("overall_rating is required", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            overall_rating: -1,
                        })
                    )
                    .expect(422));

            it("overall_rating should be 1~5", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            overall_rating: 6,
                        })
                    )
                    .expect(422));

            it("experience_in_year should not be a valid number", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            experience_in_year: "test",
                        })
                    )
                    .expect(422));

            it("experience_in_year should be 0~50", () =>
                request(app)
                    .post("/interview_experiences")
                    .send(
                        generateInterviewExperiencePayload({
                            experience_in_year: 51,
                        })
                    )
                    .expect(422));

            for (const input of ["大學", "高中", "國中"]) {
                it(`education should be ${input}`, async () => {
                    const res = await request(app)
                        .post("/interview_experiences")
                        .send(
                            generateInterviewExperiencePayload({
                                education: input,
                            })
                        )
                        .expect(200);

                    const experience = await db
                        .collection("experiences")
                        .findOne({
                            _id: ObjectId(res.body.experience._id),
                        });
                    assert.equal(experience.education, input);
                });
            }
        });

        describe("No Login status", () => {
            it("no login status create interview experience , and expected return erro code 401", () => {
                const sendData = generateInterviewExperiencePayload();
                sendData.access_token = undefined;
                return request(app)
                    .post("/interview_experiences")
                    .send(sendData)
                    .expect(401);
            });
        });

        after(async () => {
            await db.collection("experiences").deleteMany({});
            await db.collection("companies").deleteMany({});
        });

        afterEach(() => {
            sandbox.restore();
        });
    });
});
