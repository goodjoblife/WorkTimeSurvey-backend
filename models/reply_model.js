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
     * @param {string} experienceId - experience's id
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @param {string} content - reply content
     * @returns {Promise}
     *  - resolved : {
     *          "experience_id" : abcd123,
     *          "user" : { "id" : 1111 , "type" : "facebook" },
     *          "created_at" : Date Object,
     *          "content" : "這是留言",
     *          "status" : "published"
     *      }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    createReply(experience_id, user, content) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.insertOne({
                "experience_id": new ObjectId(experience_id),
                "user": user,
                "created_at": new Date(),
                "content": content,
                "status": "published",
            });
        }).then((result) => {
            return {
                "reply": {
                    "id": result.ops[0]._id.toString(),
                    "content": content,
                    "like_count": 0,
                    "floor": 1,
                },
            };
        }).catch((err) => {
            throw err;
        });
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
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.find({
                experience_id: new ObjectId(experience_id),
            }).sort(sort).skip(skip).limit(limit).toArray();

        }).catch((err) => {
            throw err;
        });
    }
}


module.exports = ReplyModel;
