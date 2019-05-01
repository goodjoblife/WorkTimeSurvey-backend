const { assert } = require("chai");
const { connectMongo } = require("../../models/connect");
const create_capped_collection = require("./create-jobTitleKeywords-collection");

describe("Job title Keywords Test", function() {
    let db = null;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("Collection job_title_keywords", function() {
        it("should return true, if the collection is capped", function() {
            return db
                .collection("job_title_keywords")
                .isCapped()
                .then(result => {
                    assert.isTrue(result);
                });
        });
    });

    after(function() {
        return db
            .collection("job_title_keywords")
            .drop()
            .then(() => create_capped_collection(db));
    });
});
