const DBRef = require('mongodb').DBRef;
const ObjectId = require('mongodb').ObjectId;
const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ExperienceModel = require('./experience_model');

class LikeModel {

    constructor(db) {
        this.collection = db.collection('likes');
        this.replies_collection = db.collection('replies');
        this._db = db;
    }
    /**
     * 新增讚至一篇文章
     * @param {string} experience_id - experience's id
     * @param {object} user -
     * {
     *  id : "xxxxx",
     *  type : "facebook",
     * }
     * @returns {Promise}
     *  - resolved : "xxxxx" (like's id)
     *  - reject : ObjectNotExistError / Default Error
     */
    createLikeToExperience(experience_id, user) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            const data = {
                "user": user,
                "ref": new DBRef('experiences', new ObjectId(experience_id)),
            };
            return this.collection.insertOne(data);
        }).then((result) => {
            return result.insertedId;
        }).catch((err) => {
            if (err.code === 11000) {  //E11000 duplicate key error
                throw new DuplicateKeyError("該篇文章已經被按讚");
            } else {
                throw err;
            }
        });
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
