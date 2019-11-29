const { assert } = require("chai");
const { ObjectId } = require("mongodb");
const { connectMongo } = require("../../models/connect");
const migration = require("./migration-2019-11-28-update-user-name");

describe("Migrate user.facebook.name or user.google.name to user.name", function() {
    let db;
    const facebook_user_id = ObjectId();
    const google_user_id = ObjectId();
    const facebook_name = "facebook_name";
    const google_name = "google_name";

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        // generate fake data
        await db.collection("users").insertOne({
            _id: facebook_user_id,
            facebook: {
                name: facebook_name,
            },
        });
        await db.collection("users").insertOne({
            _id: google_user_id,
            google: {
                name: google_name,
            },
        });
    });

    it("should update user.name from user.facebook.name", async () => {
        await migration(db);
        const user = await db.collection("users").findOne({
            _id: facebook_user_id,
        });
        assert.propertyVal(user, "name", facebook_name);
    });

    it("should update user.name from user.google.name if user.facebook.name does not exist", async () => {
        await migration(db);
        const user = await db.collection("users").findOne({
            _id: google_user_id,
        });
        assert.propertyVal(user, "name", google_name);
    });

    afterEach(async () => {
        await db.collection("users").deleteMany({});
    });
});
