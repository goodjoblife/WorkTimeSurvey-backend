const { assert } = require("chai");
const { ObjectId } = require("mongodb");
const { ObjectNotExistError } = require("../libs/errors");
const { ensureToObjectId } = require("./");

describe("ensureToObjectId", () => {
    it("will return ObjectId", () => {
        const obj = ensureToObjectId("59afe149707f743bb38d495f");

        assert.instanceOf(obj, ObjectId);
    });

    it("will return ObjectId if ObjectId given", () => {
        const obj = ensureToObjectId(new ObjectId());

        assert.instanceOf(obj, ObjectId);
    });

    it("will throw ObjectNotExistError if parameter is not string", () => {
        assert.throws(() => {
            ensureToObjectId(123);
        }, ObjectNotExistError);
    });

    it("will throw ObjectNotExistError if parameter is not a valid ObjectId", () => {
        assert.throws(() => {
            ensureToObjectId("123");
        }, ObjectNotExistError);
    });
});
