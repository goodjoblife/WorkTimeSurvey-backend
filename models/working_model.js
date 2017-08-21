const mongo = require('mongodb');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

class WorkingModel {

    constructor(db) {
        this.collection = db.collection('workings');
    }
    /**
     * 使用 workings id 來取得 working
     * @param {String} id_str - working id string
     * @param {Object} opt - mongodb find field filter
     * @param {Promise}
     */
    getWorkingsById(id_str, opt = {}) {
        if (!this._isValidId(id_str)) {
            return Promise.reject(new ObjectNotExistError("該筆資訊不存在"));
        }

        return this.collection.findOne({
            _id: new mongo.ObjectId(id_str),
        }, opt).then((result) => {
            if (result) {
                return result;
            }
            throw new ObjectNotExistError("該筆資訊不存在");
        });
    }

    /**
     * update the workings status by id
     * @param  {Stirng} id_str - workings id string
     * @param  {String} status
     * @returns {Promise}
     * @returns {ObjectId} _id - update experience id
     */
    updateStatus(id_str, status) {
        return this.collection.findOneAndUpdate({
            _id: new mongo.ObjectId(id_str),
        }, {
            $set: {
                status,
            },
        }, {
            projection: {
                _id: 1,
                status: 1,
            },
            returnOriginal: false,
        });
    }

    // eslint-disable-next-line class-methods-use-this
    _isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }
}

module.exports = WorkingModel;
