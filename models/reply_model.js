const ExperienceModel = require('./experience_model');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const mongo = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

class ReplyModel {

    constructor(db) {
        this.collection = db.collection('replies');
        this._db = db;
    }

    /**
     * 新增留言至工作經驗文章中
     * @param  {string}   experience_id - experience's id
     * @param  {string}   partial_reply - {
     *      author_id : ObjectId
     *      content : "hello",
     * }
     * @returns {Promise}
     *  - resolved : {
     *          author_id: ObjectId,
     *          content: "hello",
     *          experience_id: ObjectId,
     *          floor: 1,
     *          like_count: 0,
     *          created_at: new Date()
     *      }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    createReply(experience_id, partial_reply) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return experience_model.incrementReplyCount(experience_id).then(result => result.value.reply_count);
        }).then(reply_count => {
            // 如果原本的 reply_count = 95，代表新增完這個留言後， reply_count = 96，則
            // 這個留言的 floor 是 95 （樓層數從 0 開始）

            Object.assign(partial_reply, {
                experience_id: new ObjectId(experience_id),
                floor: reply_count - 1,
                like_count: 0,
                created_at: new Date(),
            });

            return this.collection.insertOne(partial_reply);
        }).then(() => partial_reply);
    }

    /**
     * 根據經驗文章id，取得文章留言
     * @param {string} experience_id - experience's id
     * @param {number} skip - start index (Default: 0)
     * @param {number} limit - limit (Default: 20)
     * @param {object} sort - mongodb sort object (Default: { created_at:1 })
     * @returns {Promise}
     *  - Reply[]
     * Reply: {
     *      _id: ObjectId,
     *      experience_id : ObjectId,
     *      author_id: ObjectId,
     *      created_at: Date,
     *      content: "Hello GoodJob",
     *      floor: 1,
     *      like_count: 0,
     *      report_count: 0,
     *  }
     */
    getRepliesByExperienceId(experience_id, skip = 0, limit = 20, sort = {
        floor: 1,
    }) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }
            return this.collection.find({
                experience_id: new ObjectId(experience_id),
            }).sort(sort).skip(skip).limit(limit).toArray();
        });
    }

    /**
     * 根據reply id 來取得留言
     * @param {string} id - reply id
     * @returns {Promise} -
     * resolve {
     *  _id : ObjectId,
     *  experience_id : ObjectId,
     *  author_id: ObjectId,
     *  created_at: new Date(),
     *  like_count: 0,
     * }
     */
    getReplyById(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該留言不存在"));
        }

        return this.collection.findOne({
            _id: new ObjectId(id),
        });
    }
    _isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }

    incrementLikeCount(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該留言不存在"));
        }

        return this.collection.updateOne(
            {
                _id: new ObjectId(id),
            },
            {
                $inc: {
                    like_count: 1,
                },
            }
        );
    }

    decrementLikeCount(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該留言不存在"));
        }

        return this.collection.updateOne(
            {
                _id: new ObjectId(id),
            },
            {
                $inc: {
                    like_count: -1,
                },
            }
        );
    }
}

module.exports = ReplyModel;
