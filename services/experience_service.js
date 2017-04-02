const mongo = require('mongo');
const objectNotExistError = require('../libs/errors').objectNotExistError;
const objectIdError = require('../libs/errors').ObjectIdError;

class ExperienceService {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

    getExperienceById(id) {
        if (!this._isValidId) {
            throw new objectIdError("不合法的文章id");
        }

        return this.collection.findOne({
            "_id": new mongo.ObjectId(id),
        }).then((result) => {
            if (result) {
                return result;
            } else {
                throw new objectNotExistError("該文章不存在");
            }
        }).catch((err) => {
            throw err;
        });
    }
    isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }

}

module.exports = ExperienceService;
