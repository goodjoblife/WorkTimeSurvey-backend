const DBRef = require('mongodb').DBRef;
const ObjectId = require('mongodb').ObjectId;
const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;

class LikeService {

    constructor(db) {
        this.collection = db.collection('likes');
        this.replies_collection = db.collection('replies');
        this.experiences_collection = db.collection('experiences');
    }

    /**
     * 新增讚至一個留言。注意: 本服務並不會檢查該reply_id是否存在，請自行先行檢驗。
     * @param {string} reply_id - id of target reply
     * @param {object} user - user's object { "id":1111,"type":"facebook" }
     * @returns {Promise}
     */
    createLikeToReply(reply_id, user) {
        const data = {
            "user": user,
            "ref": new DBRef('replies', new ObjectId(reply_id)),
        };

        //Notice: please ensure unique index has been applied on (user, ref)
        return this.collection.insertOne(data).then(value => {
            return value.insertedId;
        }, reason => {
            if(reason.code === 11000){  //E11000 duplicate key error
                throw new DuplicateKeyError("該留言已經被按讚");
            } else {
                throw err;
            }
        })
    }

    //private function to create a like
    _createLike(collection_name, doc_id, user) {

    }

}

module.exports = LikeService;
