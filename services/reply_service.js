const mongo = require('mongodb');

class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experience_collection = db.collection('experiences');
    }

    /**
     * 新增留言至工作經驗文章中
     * @param {string} experienceId - experience's id
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @param {string} content - reply content
     * @returns {Promise}
     */
    addReply(experience_id, user, content) {
        return new Promise((resolve, reject) => {
            this._checkExperiencedIdExist(experience_id).then((result) => {
                return this.collection.insertOne({
                    "experience_id": experience_id,
                    "user": user,
                    "created_at": new Date(),
                    "content": content,
                    "status": "published",
                });
            }).then((result) => {
                resolve({
                    "reply": {
                        "id": result.ops[0]._id.toString(),
                        "content": content,
                        "like_count": 0,
                        "floor": 1,
                    },
                });
            }).catch((err) => {
                reject({
                    "msg": "this experienced doesn't exist",
                });
            });
        });
    }

    /**
     * 用來驗證要留言的文章是否存在
     * @return {Promise}
     */
    _checkExperiencedIdExist(id) {
        return new Promise((resolve, reject) => {
            this.experience_collection.findOne({
                "_id": new mongo.ObjectId(id),
            }, {
                "_id": 1,
            }).then((result) => {
                resolve({
                    data: result,
                });
            });
        });
    }
}


module.exports = ReplyService;
