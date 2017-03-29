const mongo = require('mongodb');

class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experienceCollection = db.collection('experiences');
    }

    /**
     * 新增留言至工作經驗文章中
     * @param {string} experienceId - experience's id
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @param {string} content - reply content
     * @returns {Promise}
     */
    addReply(experienceId, user, content) {
        //TODO : 回傳留言樓層
        return new Promise((resolve, reject) => {
            this._checkExperiencedIdExit(experienceId).then((result) => {
                const status = result.data[0].status;
                this.collection.insert({
                    "experience_id": experienceId,
                    "user_id": user.id,
                    "created_at": new Date(),
                    "content": content,
                    "status": status,
                }, (err, result) => {
                    if (!err) {
                        resolve({
                            "reply": {
                                "id": result.ops[0]._id.toString(),
                                "content": content,
                                "like_count": 0,
                                "floor": 1,
                            },
                        });
                    } else {
                        reject({
                            "msg": err,
                        });
                    }
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
    _checkExperiencedIdExit(id) {
        return new Promise((resolve, reject) => {
            this.experienceCollection.find({
                "_id": new mongo.ObjectId(id),
            }, {
                "_id": 1,
            }).toArray((err, result) => {
                if (!err) {
                    if (result.length == 0) {
                        reject();
                    }
                    resolve({
                        data: result,
                    });
                }
            });
        });

    }
}

module.exports = ReplyService;
