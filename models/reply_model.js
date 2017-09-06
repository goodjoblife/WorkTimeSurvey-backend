const ExperienceModel = require("./experience_model");
const ObjectNotExistError = require("../libs/errors").ObjectNotExistError;
const mongo = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

class ReplyModel {
    constructor(db) {
        this.collection = db.collection("replies");
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
        return experience_model
            .isExist(experience_id)
            .then(is_exist => {
                if (!is_exist) {
                    throw new ObjectNotExistError("該篇文章不存在");
                }

                return experience_model
                    .incrementReplyCount(experience_id)
                    .then(result => result.value.reply_count);
            })
            .then(reply_count => {
                // 如果原本的 reply_count = 95，代表新增完這個留言後， reply_count = 96，則
                // 這個留言的 floor 是 95 （樓層數從 0 開始）

                Object.assign(partial_reply, {
                    experience_id: new ObjectId(experience_id),
                    floor: reply_count - 1,
                    like_count: 0,
                    report_count: 0,
                    created_at: new Date(),
                    status: "published",
                });

                return this.collection.insertOne(partial_reply);
            })
            .then(() => partial_reply);
    }

    /**
     * 用來驗證要留言是否存在
     * @param  {string}  id_str - string
     * @return {Promise}
     *  - resolved : true/false
     *  - reject : Default error
     */
    isExist(id_str) {
        if (!mongo.ObjectId.isValid(id_str)) {
            return Promise.resolve(false);
        }

        return this.collection
            .findOne(
                {
                    _id: new mongo.ObjectId(id_str),
                },
                {
                    _id: 1,
                }
            )
            .then(result => {
                if (result) {
                    return true;
                }
                return false;
            });
    }

    /**
     * 根據經驗文章id，取得 published 的留言
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
    getPublishedRepliesByExperienceId(
        experience_id,
        skip = 0,
        limit = 20,
        sort = {
            floor: 1,
        }
    ) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then(is_exist => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }
            return this.collection
                .find({
                    experience_id: new ObjectId(experience_id),
                    status: "published",
                })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();
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

    /**
     * 根據reply id 來取得 published 的留言
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
    getPublishedReplyById(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該留言不存在"));
        }

        return this.collection.findOne({
            status: "published",
            _id: new ObjectId(id),
        });
    }

    // eslint-disable-next-line class-methods-use-this
    _isValidId(id) {
        return id && mongo.ObjectId.isValid(id);
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

    incrementReportCount(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該留言不存在"));
        }

        return this.collection.updateOne(
            {
                _id: new ObjectId(id),
            },
            {
                $inc: {
                    report_count: 1,
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

    updateStatus(_id, status) {
        return this.collection.updateOne(
            {
                _id,
            },
            {
                $set: { status },
            }
        );
    }

    /**
     * @param   {object}  query - mognodb find query
     * @returns {Promise}
     *  - resolved : 10 (Number)
     */
    getCount(query) {
        return this.collection.find(query, { _id: 1 }).count();
    }

    /**
     * 使用 query 來尋找文章
     * @param {object} query - mongodb query
     * @param {object} sort
     * @param {number} skip = 0
     * @param {number} limit = 20
     * @param {object} opt = {} - mongodb find field filter
     *
     * @returns {Promise}
     */
    getReplies(query, sort, skip = 0, limit = 20, opt = {}) {
        return this.collection
            .find(query, opt)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }
}

module.exports = ReplyModel;
