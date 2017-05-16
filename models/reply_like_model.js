const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ReplyModel = require('./reply_model');
const ObjectId = require('mongodb').ObjectId;

class ReplyLikeModel {

    constructor(db) {
        this.collection = db.collection('reply_likes');
        this._db = db;
    }

    /**
     * 新增讚至一個留言。
     * @param {string} reply_id - id of target reply
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @returns {Promise}
            resolved: the id of like document
            rejected: DuplicateKeyError / ObjectNotExistError / mongodb default reason object in promise
     */
    createLike(reply_id, user) {
        const reply_model = new ReplyModel(this._db);

        return reply_model.getReplyById(reply_id).then((reply) => {
            if (!reply) {
                throw new ObjectNotExistError("這篇留言不存在");
            }

            const data = {
                user: user,
                created_at: new Date(),
                reply_time: reply.created_at,
                reply_id: new ObjectId(reply_id),
                experience_id: reply.experience_id,
            };

            return this.collection.insertOne(data);
        }).then((value) => {
            return value.insertedId;
        }).catch(err => {
            if (err.code === 11000) { //E11000 duplicate key error
                throw new DuplicateKeyError("該留言已經被按讚");
            } else {
                throw err;
            }
        });
    }

    /**
     * Get replies likes
     * @param {array} ids - replies ids
     * @returns {Promise}
     *  - resolve : [{
     *     _id: ObjectId,
     *     created_at: new Date,
     *     user: user model,
     *     reply_time: new Date,
     *     reply_id: ObjectId,
     *     experience_id: ObjectId,
     *  }
     */
    getReplyLikesByRepliesIds(ids) {
        return this.collection.find({
            reply_id: {
                $in: ids,
            },
        }).toArray();
    }

    /**
     * 刪除一個留言的讚
     * @param {string} reply_id - id of target reply
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @returns {Promise}
            resolved
            rejected: ObjectNotExistError / mongodb default reason object in promise
     */
    deleteLike(reply_id, user) {
        const reply_model = new ReplyModel(this._db);

        return reply_model.getReplyById(reply_id).then((reply) => {
            if (!reply) {
                throw new ObjectNotExistError("這篇留言不存在");
            }

            const filter = {
                user: user,
                reply_id: new ObjectId(reply_id),
            };

            return this.collection.deleteOne(filter);
        }).then((result) => {
            if (result.deletedCount === 0) {
                throw new ObjectNotExistError("讚不存在");
            }
        });
    }
}

module.exports = ReplyLikeModel;
