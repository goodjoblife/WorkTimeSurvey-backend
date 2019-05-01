const { assert } = require("chai");
const { connectMongo } = require("../../models/connect");
const { UNVERIFIED } = require("../../models/user_model");
const migration = require("./migration-2019-05-01-add-email-status-to-users");

describe("Migrate add email_status to users", function() {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        await db.collection("users").insertMany([
            {
                facebook_id: "user1",
            },
            {
                facebook_id: "user2",
            },
        ]);
    });

    it("should add email_status `UNVERIFIED`", async () => {
        await migration(db);

        const user1 = await db.collection("users").findOne({
            facebook_id: "user1",
        });
        assert.propertyVal(user1, "email_status", UNVERIFIED);

        const user2 = await db.collection("users").findOne({
            facebook_id: "user2",
        });
        assert.propertyVal(user2, "email_status", UNVERIFIED);
    });

    afterEach(async () => {
        await db.collection("users").deleteMany({});
    });
});
