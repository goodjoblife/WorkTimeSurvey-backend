const assert = require("chai").assert;
const request = require("supertest");
const app = require("../../app");
const { connectMongo } = require("../../models/connect");

describe("jobs", () => {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("search", () => {
        before(() =>
            db.collection("job_titles").insertMany([
                {
                    des: "GOOGL",
                    isFinal: true,
                },
                {
                    des: "GOGOR",
                    isFinal: false,
                },
                {
                    des: "YAHO",
                    isFinal: true,
                },
            ])
        );

        it("will return array with _id, des", () =>
            request(app)
                .get("/jobs/search")
                .query({ key: "g" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, "0._id");
                }));

        it("will return jobs with keyword `g`", () =>
            request(app)
                .get("/jobs/search")
                .query({ key: "g" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 1);
                }));

        it("will return all jobs if missing keyword", () =>
            request(app)
                .get("/jobs/search")
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 2);
                }));

        after(() => db.collection("job_titles").deleteMany({}));
    });
});
