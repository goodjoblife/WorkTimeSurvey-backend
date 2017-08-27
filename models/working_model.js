
class WorkingModel {

    constructor(db) {
        this.collection = db.collection('workings');
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
    getWorkings(query, sort = { create_id: -1 }, skip = 0, limit = 25, opt = {}) {
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
        return this.collection.find(query, {
            _id: 1,
        }).count();
    }
}

module.exports = WorkingModel;
