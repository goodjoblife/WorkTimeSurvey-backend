const { ObjectId } = require("mongodb");
const { ObjectNotExistError } = require("../libs/errors");

module.exports.ensureToObjectId = function(id_string) {
    if (id_string instanceof ObjectId) {
        return id_string;
    }

    if (typeof id_string !== "string") {
        throw new ObjectNotExistError("id_string 必須是 string");
    }

    if (ObjectId.isValid(id_string) !== true) {
        throw new ObjectNotExistError("id_string 不是合法的 ObjectId");
    }

    return new ObjectId(id_string);
};
