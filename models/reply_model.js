const ExperienceModel = require('./experience_model');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ObjectId = require('mongodb').ObjectId;

class ReplyModel {

    constructor(db) {
        this.collection = db.collection('replies');
        this._db = db;
    }

    /**
     * 新增留言至工作經驗文章中
     * @param  {string}   experience_id - experience's id
     * @param  {object}   user          - user's object { id: 1111, type: "facebook" }
     * @param  {string}   content       - reply content
     * @returns {Promise}
     *  - resolved : {
     *          _id: ObjectId(xxx)
     *          experience_id: abcd123,
     *          user: { id: 1111, type: "facebook" },
     *          created_at: Date Object,
     *          content: "這是留言",
     *          status: "published"
     *      }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    createReply(experience_id, partial_reply) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.checkExperiencedIdExist(experience_id).then((is_exist) => {
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
                created_at: new Date(),
            });

            return this.collection.insertOne(partial_reply);
        }).then(() => partial_reply);
    }

    /**
     * 根據經驗文章id，取得文章留言
     * @param {string} experience_id - experience's id
     * @returns {Promise}
     *  - [
     *      _id : ObjectId,
     *      experience_id : ObjectId,
     *      author : {
     *          id : ObjectId,
     *      },
     *      created_at : new Date(),
     *      content : "Hello GoodJob",
     *  ]
     */
    getRepliesByExperienceId(experience_id, skip = 0, limit = 10000, sort = {created_at: 1}) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.checkExperiencedIdExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.find({
                experience_id: new ObjectId(experience_id),
            }).sort(sort).skip(skip).limit(limit).toArray();

        });
    }
}

module.exports = ReplyModel;
