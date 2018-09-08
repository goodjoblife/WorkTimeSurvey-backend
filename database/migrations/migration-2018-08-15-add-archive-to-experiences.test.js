const { assert } = require("chai");
const { connectMongo } = require("../../models/connect");
const migration = require("./migration-2018-08-15-add-archive-to-experiences");

describe("Migrate experiences (add adchived related field)", function() {
    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    it("should add two fields", async () => {
        const collection = db.collection("experiences");

        await collection.insertOne({ title: "Good", type: "interview" });

        await migration(db);

        const experience = await collection.findOne();
        assert.deepPropertyVal(experience, "archive.is_archived", false);
        assert.deepPropertyVal(experience, "archive.reason", "");
    });

    after(async () => {
        await db.collection("experiences").deleteMany({});
    });
});
