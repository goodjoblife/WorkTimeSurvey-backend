const { assert } = require("chai");
const { connectMongo } = require("../../models/connect");
const migration = require("./migration-2019-04-28-move-workings-email-to-user");

describe("Migrate workings.author.email to users.email", function() {
    const user1Email = "goodjob@gmail.com";

    let db;

    before(async () => {
        ({ db } = await connectMongo());
    });

    beforeEach(async () => {
        // generate fake data
        await db.collection("workings").insertOne({
            author: {
                id: "user1",
                email: user1Email,
            },
            created_at: new Date(),
        });
        await db.collection("workings").insertOne({
            author: {
                id: "user2",
                email: "invalid@ gmail.com",
            },
            created_at: new Date(),
        });
        await db.collection("users").insertOne({
            facebook_id: "user1",
        });
        await db.collection("users").insertOne({
            facebook_id: "user2",
        });
    });

    it("should update author1's email correctly", async () => {
        await migration(db);

        const user1 = await db.collection("users").findOne({
            facebook_id: "user1",
        });
        assert.propertyVal(user1, "email", user1Email);
    });

    it("should not update author2's email", async () => {
        await migration(db);
        const user2 = await db.collection("users").findOne({
            facebook_id: "user2",
        });
        assert.notProperty(user2, "email");
    });

    afterEach(async () => {
        await db.collection("workings").deleteMany({});
        await db.collection("users").deleteMany({});
    });
});
