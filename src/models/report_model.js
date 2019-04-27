const ExperienceModel = require("./experience_model");
const ReplyModel = require("./reply_model");
const DuplicateKeyError = require("../libs/errors").DuplicateKeyError;
const ObjectNotExistError = require("../libs/errors").ObjectNotExistError;
const { ObjectId, DBRef } = require("mongodb");

const EXPERIENCES_COLLECTION = "experiences";
const REPLIES_COLLECTION = "replies";
const NAME_MAP = {
    [EXPERIENCES_COLLECTION]: "經驗分享文章",
    [REPLIES_COLLECTION]: "留言",
};

class ReportModel {
    constructor(db) {
        this.collection = db.collection("reports");
        this._db = db;
    }

    /**
     * 新增檢舉至經驗分享
     * @param  {string}   experience_id_str - experience's id
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
    createReportToExperience(experience_id_str, partial_report) {
        return this._createReport(
            EXPERIENCES_COLLECTION,
            experience_id_str,
            partial_report
        );
    }

    /**
     * 新增檢舉至留言
     * @param  {string}   reply_id_str - reply's id
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
    createReportToReply(reply_id_str, partial_report) {
        return this._createReport(
            REPLIES_COLLECTION,
            reply_id_str,
            partial_report
        );
    }

    /**
     * 新增檢舉至經驗分享或留言
     * @param  {string}   namespace - collection of document (experiences/replies)
     * @param  {string}   id_str - reference doc's id string
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
    async _createReport(namespace, id_str, partial_report) {
        const model = this._getModel(namespace);

        const is_exist = await model.isExist(id_str);

        if (!is_exist) {
            throw new ObjectNotExistError(`該篇${NAME_MAP[namespace]}不存在`);
        }

        const report = Object.assign(partial_report, {
            ref: new DBRef(namespace, ObjectId(id_str)),
            created_at: new Date(),
        });

        try {
            await this.collection.insertOne(report);
        } catch (err) {
            if (err.code === 11000) {
                // E11000 duplicate key error
                throw new DuplicateKeyError(
                    `該篇${NAME_MAP[namespace]}已經被您檢舉過`
                );
            } else {
                throw err;
            }
        }

        await model.incrementReportCount(id_str);

        return report;
    }

    /**
     * 根據經驗分享id，取得檢舉列表
     * @param {string} experience_id_str - experience's id string
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
    getReportsByExperienceId(
        experience_id_str,
        skip = 0,
        limit = 100,
        sort = {
            created_at: 1,
        }
    ) {
        return this._getReportsByRefId(
            EXPERIENCES_COLLECTION,
            experience_id_str,
            skip,
            limit,
            sort
        );
    }

    /**
     * 根據留言id，取得檢舉列表
     * @param {string} reply_id_str - reply's id string
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
    getReportsByReplyId(
        reply_id_str,
        skip = 0,
        limit = 100,
        sort = {
            created_at: 1,
        }
    ) {
        return this._getReportsByRefId(
            REPLIES_COLLECTION,
            reply_id_str,
            skip,
            limit,
            sort
        );
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
    async _getReportsByRefId(
        namespace,
        id_str,
        skip = 0,
        limit = 20,
        sort = { created_at: 1 }
    ) {
        const model = this._getModel(namespace);

        const is_exist = await model.isExist(id_str);
        if (!is_exist) {
            throw new ObjectNotExistError(`該篇${NAME_MAP[namespace]}不存在`);
        }

        const query = {
            ref: new DBRef(namespace, new ObjectId(id_str)),
        };

        return this.collection
            .find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }

    /**
     * 根據report id 來取得檢舉
     * @param {string} id_str - report id string
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
    async getReportById(id_str) {
        if (!this._isValidId(id_str)) {
            throw new ObjectNotExistError("該檢舉不存在");
        }

        return this.collection.findOne({ _id: new ObjectId(id_str) });
    }

    // eslint-disable-next-line class-methods-use-this
    _isValidId(id_str) {
        return id_str && ObjectId.isValid(id_str);
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
