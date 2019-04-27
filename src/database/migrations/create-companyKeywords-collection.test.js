const assert = require("chai").assert;
const { connectMongo } = require("../../models/connect");
const create_capped_collection = require("./create-companyKeywords-collection");

describe("Company Keywords Test", function() {
    let db = null;

    before(async () => {
        ({ db } = await connectMongo());
    });

    describe("Collection company_keywords", function() {
        it("should return true, if the collection is capped", function() {
            return db
                .collection("company_keywords")
                .isCapped()
                .then(result => {
                    assert.isTrue(result);
                });
        });
    });

    after(function() {
        return db
            .collection("company_keywords")
            .drop()
            .then(() => create_capped_collection(db));
    });
});
