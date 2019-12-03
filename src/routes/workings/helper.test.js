const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
const assert = chai.assert;
const { connectMongo } = require("../../models/connect");
const HttpError = require("../../libs/errors").HttpError;
const helper = require("./helper");

describe("Workings Helper", () => {
    describe("checkAndUpdateQuota", () => {
        let db;

        before(async () => {
            ({ db } = await connectMongo());
        });

        before("Seeding", () =>
            db.collection("users").insertMany([
                {
                    _id: "AAA",
                    time_and_salary_count: 4,
                },
                {
                    _id: "BBB",
                    time_and_salary_count: 5,
                },
            ])
        );

        it("fulfilled with queries_count if quota is OK", () =>
            assert.becomes(helper.checkAndUpdateQuota(db, "AAA"), 5));

        it("rejected with HttpError if quota is reached", () =>
            assert.isRejected(
                helper.checkAndUpdateQuota(db, "BBB"),
                HttpError
            ));

        after(() => db.collection("users").deleteMany({}));
    });
});
