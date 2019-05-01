const { assert } = require("chai");
const { connectMongo } = require("../../models/connect");
const create_capped_collection = require("./migration-2017-09-08-create-popularExperienceLogs-collection");

describe("Popular Expereince Logs Test", function() {
    let db = null;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("Collection popular_experience_logs", function() {
        it("should return true, if the collection is capped", function() {
            return db
                .collection("popular_experience_logs")
                .isCapped()
                .then(result => {
                    assert.isTrue(result);
                });
        });
    });

    after(function() {
        return db
            .collection("popular_experience_logs")
            .drop()
            .then(() => create_capped_collection(db));
    });
});
