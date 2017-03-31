const ObjectId = require('mongodb').ObjectId;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experiences_collection = db.collection('experiences');
    }


    /**
     * 檢查該留言是否存在。
     * @param {string} id - id of the reply
     * @returns {Promise}
            resolved: null
            rejected: ObjectNotExistError or mongodb default reason object in promise
     */
    checkIdExist(id) {
        return this.collection.findOne({_id: new ObjectId(id)}).then(value => {
            if(value === null) {
                throw new ObjectNotExistError("該留言不存在");
            } else {
                return value;
            }
        }, reason => {
            throw reason;
        });
    }

}

module.exports = ReplyService;
