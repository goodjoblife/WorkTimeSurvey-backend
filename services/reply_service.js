const Experience_Service = require('./experience_service');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experience_service = new Experience_Service(db);
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
        return this.experience_service.checkExperiencedIdExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.insertOne({
                "experience_id": experience_id,
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
}


module.exports = ReplyService;
