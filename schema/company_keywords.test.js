const { assert } = require("chai");
const request = require("supertest");
const { connectMongo } = require("../models/connect");
const ModelManager = require("../models/manager");

const app = require("../app");
const create_capped_collection = require("../database/migrations/create-companyKeywords-collection");

describe("Query company_keywords", () => {
    let db;
    let manager;

    before(async () => {
        ({ db } = await connectMongo());
        manager = new ModelManager(db);
    });

    before(() =>
        manager.CompanyKeywordModel.collection.insertMany([
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
            query: `{
                    company_keywords
                }`,
            variables: null,
        };
        const res = await request(app)
            .post("/graphql")
            .send(payload)
            .expect(200);

        assert.property(res.body.data, "company_keywords");
        const company_keywords = res.body.data.company_keywords;
        assert.isArray(company_keywords);
        assert.lengthOf(company_keywords, 5);
        assert.equal(company_keywords[0], "GoodJob");
        assert.equal(company_keywords[1], "GoodJob2");
    });

    after(async () => {
        await manager.CompanyKeywordModel.collection.drop();
        await create_capped_collection(db);
    });
});
