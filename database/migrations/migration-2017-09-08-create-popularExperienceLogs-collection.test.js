const { assert } = require("chai");
const { MongoClient } = require("mongodb");
const config = require("config");
const create_capped_collection = require("./migration-2017-09-08-create-popularExperienceLogs-collection");

describe("Popular Expereince Logs Test", function() {
    let db = null;

    before(function() {
        return MongoClient.connect(config.get("MONGODB_URI")).then(function(
            _db
        ) {
            db = _db;
        });
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
