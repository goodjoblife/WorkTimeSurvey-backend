const DBRef = require('mongodb').DBRef;
const ObjectId = require('mongodb').ObjectId;
const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

class LikeModel {

    constructor(db) {
        this.collection = db.collection('likes');
        this.replies_collection = db.collection('replies');
        this.experiences_collection = db.collection('experiences');
    }

    /**
     * 新增讚至一個留言。
     * @param {string} reply_id - id of target reply
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @returns {Promise}
            resolved: the id of like document
            rejected: DuplicateKeyError / ObjectNotExistError / mongodb default reason object in promise
     */
    createLikeToReply(reply_id, user) {
        const data = {
            "user": user,
            "ref": new DBRef('replies', new ObjectId(reply_id)),
        };

        //Notice: please ensure unique index has been applied on (user, ref)
        return this._checkReplyIdExist(reply_id).then(value => {
            return this.collection.insertOne(data);
        }).then(value => {
            return value.insertedId;
        }).catch(reason => {
            if (reason instanceof ObjectNotExistError) {
                throw reason;
            } else if (reason.code === 11000) {  //E11000 duplicate key error
                throw new DuplicateKeyError("該留言已經被按讚");
            } else {
                throw reason;
            }
        });
    }

    /**
     * 檢查該留言是否存在。
     * @param {string} id - id of the reply
     * @returns {Promise}
            resolved: the object of the reply
            rejected: ObjectNotExistError or mongodb default reason object in promise
     */
    _checkReplyIdExist(id) {
        return this.replies_collection.findOne({_id: new ObjectId(id)}).then(value => {
            if (value === null) {
                throw new ObjectNotExistError("該留言不存在");
            } else {
                return value;
            }
        }, reason => {
            throw reason;
        });
    }

}

module.exports = LikeModel;
