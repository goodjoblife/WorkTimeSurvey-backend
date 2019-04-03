const mongo = require("mongodb");
const ObjectNotExistError = require("../libs/errors").ObjectNotExistError;

class WorkingModel {
    constructor(db) {
        this.collection = db.collection("workings");
    }
    /**
     * 使用 query 來取得 workings
     * @param  {Object} query - mongodb find query
     * @param  {Object} sort - { created_at: -1 }
     * @param  {Number} skip - 0
     * @param  {Number} limit - 25
     * @param  {Object} opt - mongodb find field filter
     *
     * @returns {Promise}
     */
    getWorkings(
        query,
        sort = { created_at: -1 },
        skip = 0,
        limit = 25,
        opt = {}
    ) {
        return this.collection
            .find(query, opt)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .toArray();
    }

    /**
     * 取得搜尋的workings總數
     * @param   {object}  query - mognodb find query
     * @returns {Promise}
     *  - {Number} resolved : 10
     */
    getWorkingsCountByQuery(query) {
        return this.collection
            .find(query, {
                _id: 1,
            })
            .count();
    }

    /**
     * 使用 workings id 來取得 working
     * @param {String} id_str - working id string
     * @param {Object} opt - mongodb find field filter
     * @return {Promise}
     */
    async getWorkingsById(id_str, opt = {}) {
        if (!this._isValidId(id_str)) {
            throw new ObjectNotExistError("該筆資訊不存在");
        }

        const result = await this.collection.findOne(
            {
                _id: new mongo.ObjectId(id_str),
            },
            opt
        );

        if (result) {
            return result;
        }

        throw new ObjectNotExistError("該筆資訊不存在");
    }

    /**
     * update the workings status by id
     * @param  {Stirng} id_str - workings id string
     * @param  {String} status
     * @returns {Promise}
     *  - resolve : {
     *    {ObjectId} _id - update working id
     *    {String} status - after updated , the status value
     * }
     */
    updateStatus(id_str, status) {
        return this.collection.findOneAndUpdate(
            {
                _id: new mongo.ObjectId(id_str),
            },
            {
                $set: {
                    status,
                },
            },
            {
                projection: {
                    _id: 1,
                    status: 1,
                },
                returnOriginal: false,
            }
        );
    }

    // eslint-disable-next-line class-methods-use-this
    _isValidId(id) {
        return id && mongo.ObjectId.isValid(id);
    }
}

module.exports = WorkingModel;
