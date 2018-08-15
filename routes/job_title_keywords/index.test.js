const { assert } = require("chai");
const request = require("supertest");
const { connectMongo } = require("../../models/connect");
const ModelManager = require("../../models/manager");

const app = require("../../app");
const create_capped_collection = require("../../database/migrations/create-jobTitleKeywords-collection");

describe("job_title_keywords", () => {
    let db;
    let manager;

    before(async () => {
        ({ db } = await connectMongo());
        manager = new ModelManager(db);
    });

    describe("GET /job_title_keywords", () => {
        const path = "/job_title_keywords";

        before(() =>
            manager.JobTitleKeywordModel.collection.insertMany([
                { word: "GoodJob" },
                { word: "GoodJob" },
                { word: "GoodJob" },
                { word: "GoodJob2" },
                { word: "GoodJob2" },
                { word: "GoodJob3" },
                { word: "GoodJob4" },
                { word: "GoodJob5" },
                { word: "GoodJob6" },
            ])
        );

        it("will return keywords in order", () =>
            request(app)
                .get(path)
                .query({ num: "2" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body.keywords);
                    assert.equal(res.body.keywords.length, 2);
                    assert.equal(res.body.keywords[0], "GoodJob");
                    assert.equal(res.body.keywords[1], "GoodJob2");
                }));

        it("number should be 1~20", () =>
            request(app)
                .get(path)
                .query({ num: "0" })
                .expect(422));

        it("number should be 1~20", () =>
            request(app)
                .get(path)
                .query({ num: "100" })
                .expect(422));

        it("num should be integer number", () =>
            request(app)
                .get(path)
                .query({ num: "10.5" })
                .expect(422));

        it("number default will be 5", () =>
            request(app)
                .get(path)
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body.keywords);
                    assert.lengthOf(res.body.keywords, 5);
                }));

        after(async () => {
            await manager.JobTitleKeywordModel.collection.drop();
            await create_capped_collection(db);
        });
    });
});
