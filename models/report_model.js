const ExperienceModel = require('./experience_model');
const ReplyModel = require('./reply_model');
const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const mongo = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const DBRef = require('mongodb').DBRef;

const EXPERIENCES_COLLECTION = 'experiences';
const REPLIES_COLLECTION = 'replies';
const NAME_MAP = {
    [EXPERIENCES_COLLECTION]: '經驗分享文章',
    [REPLIES_COLLECTION]: '留言',
};

class ReportModel {

    constructor(db) {
        this.collection = db.collection('reports');
        this._db = db;
    }

    /**
     * 新增檢舉至經驗分享
     * @param  {string}   experience_id - experience's id
     * @param  {string}   partial_report - {
     *      user_id : ObjectId,
     *      reason_category : String,
     *      reason: String,
     * }
     * @returns {Promise}
     *  - resolved : {
     *      _id: ObjectId,
     *      ref: DBRef,
     *      user_id: ObjectId,
     *      reason_category : String,
     *      reason: String,
     *      created_at: Date,
     * }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    createReportToExperience(experience_id, partial_report) {
        return this._createReport(EXPERIENCES_COLLECTION, experience_id, partial_report);
    }

    /**
     * 新增檢舉至留言
     * @param  {string}   reply_id - reply's id
     * @param  {string}   partial_report - {
     *      user_id : ObjectId,
     *      reason_category : String,
     *      reason: String,
     * }
     * @returns {Promise}
     *  - resolved : {
     *      _id: ObjectId,
     *      ref: DBRef,
     *      user_id: ObjectId,
     *      reason_category : String,
     *      reason: String,
     *      created_at: Date,
     * }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    createReportToReply(reply_id, partial_report) {
        return this._createReport(REPLIES_COLLECTION, reply_id, partial_report);
    }

    /**
     * 新增檢舉至經驗分享或留言
     * @param  {string}   namespace - collection of document (experiences/replies)
     * @param  {string}   id - reference doc's id
     * @param  {string}   partial_report - {
     *      user_id : ObjectId,
     *      reason_category : String,
     *      reason: String,
     * }
     * @returns {Promise}
     *  - resolved : {
     *      _id: ObjectId,
     *      ref: DBRef,
     *      user_id: ObjectId,
     *      reason_category : String,
     *      reason: String,
     *      created_at: Date,
     * }
     *
     *  - reject : defaultError/ObjectNotExistError
     *
     */
    _createReport(namespace, id, partial_report) {
        const model = this._getModel(namespace);
        let document;
        return model.isExist(id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError(`該篇${NAME_MAP[namespace]}不存在`);
            }
            Object.assign(partial_report, {
                ref: new DBRef(EXPERIENCES_COLLECTION, id),
                created_at: new Date(),
            });

            return this.collection.insertOne(partial_report);
        }).then((result) => {
            document = result;
            return model.incrementReportCount(id);
        }).then(() => document)
        .catch((err) => {
            if (err.code === 11000) { // E11000 duplicate key error
                throw new DuplicateKeyError(`該篇${NAME_MAP[namespace]}已經被您檢舉過`);
            } else {
                throw err;
            }
        });
    }

    /**
     * 根據經驗分享id，取得檢舉列表
     * @param {string} experience_id - experience's id
     * @param {number} skip - start index (Default: 0)
     * @param {number} limit - limit (Default: 20)
     * @param {object} sort - mongodb sort object (Default: { created_at:1 })
     * @returns {Promise}
     *  - Report[]
     * Report: {
     *      _id: ObjectId,
     *      ref : DBRef,
     *      user_id: ObjectId,
     *      created_at: Date,
     *      reason_category: String,
     *      reason: String,
     *  }
     */
    getReportsByExperienceId(experience_id, skip = 0, limit = 100, sort = {
        created_at: 1,
    }) {
        return this._getReportsByRefId(EXPERIENCES_COLLECTION, experience_id, skip, limit, sort);
    }

    /**
     * 根據留言id，取得檢舉列表
     * @param {string} reply_id - reply's id
     * @param {number} skip - start index (Default: 0)
     * @param {number} limit - limit (Default: 20)
     * @param {object} sort - mongodb sort object (Default: { created_at:1 })
     * @returns {Promise}
     *  - Report[]
     * Report: {
     *      _id: ObjectId,
     *      ref : DBRef,
     *      user_id: ObjectId,
     *      created_at: Date,
     *      reason_category: String,
     *      reason: String,
     *  }
     */
    getReportsByReplyId(reply_id, skip = 0, limit = 100, sort = {
        created_at: 1,
    }) {
        return this._getReportsByRefId(REPLIES_COLLECTION, reply_id, skip, limit, sort);
    }


    /**
     * 根據經驗分享或留言，取得文章檢舉列表
     * @param {string} namespace - collection name (experiences/replies)
     * @param {string} id - reference doc's id
     * @param {number} skip - start index (Default: 0)
     * @param {number} limit - limit (Default: 20)
     * @param {object} sort - mongodb sort object (Default: { created_at:1 })
     * @returns {Promise}
     *  - Report[]
     * Report: {
     *      _id: ObjectId,
     *      ref : DBRef,
     *      user_id: ObjectId,
     *      created_at: Date,
     *      reason_category: String,
     *      reason: String,
     *  }
     */
    _getReportsByRefId(namespace, id, skip, limit, sort) {
        const model = this._getModel(namespace);
        return model.isExist(id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError(`該篇${NAME_MAP[namespace]}不存在`);
            }
            return this.collection.find({
                ref: new DBRef(namespace, id),
            }).sort(sort).skip(skip).limit(limit)
            .toArray();
        });
    }

    /**
     * 根據report id 來取得檢舉
     * @param {string} id - report id
     * @returns {Promise} -
     * resolve {
     *      _id: ObjectId,
     *      ref : DBRef,
     *      user_id: ObjectId,
     *      created_at: Date,
     *      reason_category: String,
     *      reason: String,
     *  }
     */
    getReportById(id) {
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該檢舉不存在"));
        }

        return this.collection.findOne({
            _id: new ObjectId(id),
        });
    }

    // eslint-disable-next-line class-methods-use-this
    _isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }

    _getModel(namespace) {
        if (namespace === EXPERIENCES_COLLECTION) {
            return new ExperienceModel(this._db);
        } else if (namespace === REPLIES_COLLECTION) {
            return new ReplyModel(this._db);
        }
        return null;
    }
}

module.exports = ReportModel;
