const { assert } = require("chai");
const request = require("supertest");
const { connectMongo } = require("../models/connect");
const ModelManager = require("../models/manager");

const app = require("../app");
const create_capped_collection = require("../database/migrations/create-jobTitleKeywords-collection");

describe("Query job_title_keywords", () => {
    let db;
    let manager;

    before(async () => {
        ({ db } = await connectMongo());
        manager = new ModelManager(db);
    });

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

    it("will return keywords in order", async () => {
        const payload = {
            query: /* GraphQL */ `
                {
                    job_title_keywords
                }
            `,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body.data, "job_title_keywords");
        const job_title_keywords = res.body.data.job_title_keywords;
        assert.isArray(job_title_keywords);
        assert.lengthOf(job_title_keywords, 5);
        assert.equal(job_title_keywords[0], "GoodJob");
        assert.equal(job_title_keywords[1], "GoodJob2");
    });

    it("throw error if input invalid", async () => {
        const payload = {
            query: /* GraphQL */ `
                {
                    job_title_keywords(limit: 0)
                }
            `,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body, "errors");
        assert.deepPropertyVal(
            res.body,
            "errors.0.extensions.code",
            "BAD_USER_INPUT"
        );
    });

    after(async () => {
        await manager.JobTitleKeywordModel.collection.drop();
        await create_capped_collection(db);
    });
});
