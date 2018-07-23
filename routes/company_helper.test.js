const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const assert = chai.assert;
const { connectMongo } = require("../models/connect");
const helper = require("./company_helper");
const ModelManager = require("../models/manager");

describe("company Helper", () => {
    describe("Get company by Id or query", () => {
        let db;
        let company_model;

        before(async () => {
            ({ db } = await connectMongo());
            const manager = new ModelManager(db);
            company_model = manager.CompanyModel;
        });

        before("Seed companies", () =>
            company_model.collection.insertMany([
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
                {
                    id: "00000004",
                    name: ["GOODJOBMARK", "馬克的公司"],
                },
                {
                    id: "00000005",
                    name: [
                        ["GOODJOBMARK", "馬克的公司"],
                        ["GOOBJOBMARK", "Mark Co"],
                    ],
                },
            ])
        );

        it("只給 company_id", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(company_model, "00000001"),
                {
                    id: "00000001",
                    name: "GOODJOB",
                }
            ));

        it("禁止錯誤的 company_id", () =>
            assert.isRejected(
                helper.getCompanyByIdOrQuery(company_model, "00000000")
            ));

        it("只給 company query", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(
                    company_model,
                    undefined,
                    "GOODJOB"
                ),
                {
                    id: "00000001",
                    name: "GOODJOB",
                }
            ));

        it("當 company 是小寫時，轉換成大寫", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(
                    company_model,
                    undefined,
                    "GoodJob"
                ),
                {
                    id: "00000001",
                    name: "GOODJOB",
                }
            ));

        it("只給 company，但名稱無法決定唯一公司", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(
                    company_model,
                    undefined,
                    "GoodJobGreat"
                ),
                {
                    name: "GOODJOBGREAT",
                }
            ));

        it("取得公司名稱時，如果是陣列，則取出第一個字串", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(company_model, "00000004"),
                {
                    id: "00000004",
                    name: "GOODJOBMARK",
                }
            ));

        it("取得公司名稱時，如果是多重陣列，則取出第一個陣列的第一個字串", () =>
            assert.becomes(
                helper.getCompanyByIdOrQuery(company_model, "00000005"),
                {
                    id: "00000005",
                    name: "GOODJOBMARK",
                }
            ));

        after("DB: 清除 companies", () =>
            company_model.collection.deleteMany({})
        );
    });
});
