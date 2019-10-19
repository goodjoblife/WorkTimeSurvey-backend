/*
 * ViewLog {
 *   _id         : ObjectId!
 *   user_id     : ObjectId
 *   action      : String!
 *   content_id  : ObjectId!
 *   content_type: String!
 *   referrer    : String
 *   created_at  : Date!
 * }
 */

class ViewLogModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("view_logs");
    }

    async insertMany(logs) {
        return await this.collection.insertMany(logs);
    }
}

module.exports = ViewLogModel;
module.exports.VIEW_ACTION = "VIEW";
module.exports.SALARY_WORK_TIME_TYPE = "SALARY_WORK_TIME";
module.exports.EXPERIENCE_TYPE = "EXPERIENCE";
