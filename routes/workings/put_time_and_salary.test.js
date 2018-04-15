const { assert } = require("chai");
const request = require("supertest");
const { MongoClient, ObjectId } = require("mongodb");
const sinon = require("sinon");
const config = require("config");
const app = require("../../app");
const authentication = require("../../libs/authentication");

function generatePayload(options) {
    const opt = options || {};
    const valid = {
        _id: ObjectId("5a04697e1e33010063546c94"),
        access_token: "random",
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

describe("更新 time and salary 資訊", () => {
    let db;
    let sandbox;
    let cachedFacebookAuthentication;
    let fakeClock;
    const now = new Date();
    const fake_user = {
        _id: new ObjectId(),
        facebook_id: "-1",
        facebook: {
            id: "-1",
            name: "mark",
        },
    };

    before("DB: Setup", async () => {
        db = await MongoClient.connect(config.get("MONGODB_URI"));
    });

    beforeEach(async () => {
        sandbox = sinon.sandbox.create();
        cachedFacebookAuthentication = sandbox.stub(
            authentication,
            "cachedFacebookAuthentication"
        );
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, "random")
            .resolves(fake_user);
        cachedFacebookAuthentication
            .withArgs(sinon.match.object, sinon.match.object, "invalid")
            .rejects();
    });

    describe("PUT /workings/:id", () => {
        before("Seed companies", () =>
            db.collection("companies").insertMany([
                {
                    id: "00000001",
                    name: "GOODJOB",
                },
            ])
        );

        beforeEach(async () => {
            await db.collection("workings").insertOne(generatePayload());

            fakeClock = sinon.useFakeTimers(now.getTime());
        });

        it("get 200 and return success is true", async () => {
            const result = await request(app)
                .put("/workings/5a04697e1e33010063546c94")
                .send(generatePayload())
                .expect(200);

            assert.propertyVal(result.body, "success", true);
        });

        it("modify time_and_salary", async () => {
            await request(app)
                .put("/workings/5a04697e1e33010063546c94")
                .send(
                    generatePayload({
                        job_title: "GoodJob666",
                    })
                )
                .expect(200);

            const new_time_and_salary = await db
                .collection("workings")
                .find()
                .toArray();

            assert.lengthOf(new_time_and_salary, 1);
            assert.propertyVal(
                new_time_and_salary[0],
                "job_title",
                "GOODJOB666"
            );
            assert.equal(
                new_time_and_salary[0].updated_at.getTime(),
                now.getTime()
            );
        });

        it("insert old data in history collection", async () => {
            await request(app)
                .put("/workings/5a04697e1e33010063546c94")
                .send(
                    generatePayload({
                        job_title: "GoodJob666",
                    })
                )
                .expect(200);

            const old_time_and_salary = await db
                .collection("time_and_salary_history")
                .find()
                .toArray();

            assert.lengthOf(old_time_and_salary, 1);
            assert.propertyVal(old_time_and_salary[0], "job_title", "test");
            assert.equal(
                ObjectId(old_time_and_salary[0].ref_id).toString(),
                ObjectId("5a04697e1e33010063546c94").toString()
            );
            assert.equal(
                old_time_and_salary[0].updated_at.getTime(),
                now.getTime()
            );
        });

        describe("Common Data Validation Part", () => {
            it("job_title is required", () =>
                request(app)
                    .put("/workings/5a04697e1e33010063546c94")
                    .send(
                        generatePayload({
                            job_title: -1,
                        })
                    )
                    .expect(422));
        });

        afterEach(async () => {
            sandbox.restore();
            fakeClock.restore();
            await db.collection("time_and_salary_history").deleteMany({});
            await db.collection("workings").deleteMany({});
        });

        after(() => db.collection("companies").deleteMany({}));
    });
});
