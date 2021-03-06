const assert = require("chai").assert;
const request = require("supertest");
const app = require("../../app");
const { connectMongo } = require("../../models/connect");
const ModelManager = require("../../models/manager");

describe("companies", () => {
    let db;
    let company_model;

    before(async () => {
        ({ db } = await connectMongo());
        const manager = new ModelManager(db);
        company_model = manager.CompanyModel;
    });

    describe("GET /companies/search", () => {
        const path = "/companies/search";

        before(() =>
            company_model.collection.insertMany([
                {
                    id: "00000001",
                    name: "MARK CHEN",
                    capital: 1000,
                },
                {
                    id: "00000002",
                    name: "CHEN MARK",
                    capital: 2000,
                },
                {
                    id: "00000003",
                    name: "MARK86092",
                    capital: 2000,
                },
                {
                    id: "00000004",
                    name: "公司好工作",
                    capital: 2500,
                },
                {
                    id: "00000005",
                    name: "公司好薪情",
                    capital: 3000,
                },
                {
                    id: "00000006",
                    name: [["好薪情", "你好"], ["Good", "Job"]],
                    capital: 3000,
                },
            ])
        );

        it("包含兩個欄位：id, name", () =>
            request(app)
                .get(path)
                .query({ key: "MARK" })
                .expect(200)
                .expect(res => {
                    assert.isArray(res.body);
                    assert.deepProperty(res.body, "0.id");
                    assert.deepProperty(res.body, "0.name");
                }));

        it("搜尋 `MARK`", () =>
            request(app)
                .get(path)
                .query({ key: "MARK" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 2);
                }));

        it("搜尋 `公司`", () =>
            request(app)
                .get(path)
                .query({ key: "公司" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 2);
                }));

        it("搜尋 id `00000004`", () =>
            request(app)
                .get(path)
                .query({ key: "00000004" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 1);
                    assert.propertyVal(res.body[0], "id", "00000004");
                    assert.propertyVal(res.body[0], "name", "公司好工作");
                    assert.propertyVal(res.body[0], "capital", 2500);
                }));

        it("搜尋小寫關鍵字 `mark`", () =>
            request(app)
                .get(path)
                .query({ key: "mark" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 2);
                }));

        it("沒有關鍵字，要輸出錯誤", () =>
            request(app)
                .get(path)
                .expect(422));

        it("搜尋 id `00000006` 公司名稱為字串 ", () =>
            request(app)
                .get(path)
                .query({ key: "00000006" })
                .expect(200)
                .expect(res => {
                    assert.lengthOf(res.body, 1);
                    assert.propertyVal(res.body[0], "id", "00000006");
                    assert.isString(res.body[0].name);
                    assert.propertyVal(res.body[0], "name", "好薪情");
                    assert.propertyVal(res.body[0], "capital", 3000);
                }));

        after(() => company_model.collection.deleteMany({}));
    });
});
