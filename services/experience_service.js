const mongo = require('mongodb');

class ExperienceService {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

    /**
     * 用來驗證要留言的文章是否存在
     * @return {Promise}
     *  - resolved : true/false
     *  - reject : Default error
     */
    checkExperiencedIdExist(id) {
        if (!mongo.ObjectId.isValid(id)) {
            return Promise.resolve(false);
        }

        return this.collection.findOne({
            "_id": new mongo.ObjectId(id),
        }, {
            "_id": 1,
        }).then((result) => {
            if (result) {
                return true;
            } else {
                return false;
            }
        }).catch((err) => {
            throw err;
        });
    }

}

module.exports = ExperienceService;
