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
                    facebook_id: "001",
                    time_and_salary_count: 4,
                },
                {
                    facebook_id: "002",
                    time_and_salary_count: 5,
                },
            ])
        );

        it("fulfilled with queries_count if quota is OK", () =>
            assert.becomes(
                helper.checkAndUpdateQuota(db, { id: "001", type: "facebook" }),
                5
            ));

        it("rejected with HttpError if quota is reached", () =>
            assert.isRejected(
                helper.checkAndUpdateQuota(db, { id: "001", type: "facebook" }),
                HttpError
            ));

        after(() => db.collection("users").deleteMany({}));
    });
});
