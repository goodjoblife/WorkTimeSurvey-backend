const mongo = require('mongodb');
const ObjectNotExistError = require('../libs/errors').objectNotExistError;

class ExperienceService {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

    /**
     * 使用experience Id 來取得單篇文章
     * @param {string} id - erperiences's id
     * @returns {Promise}
     *  - resolved : {
     *      type : "interview",
     *      created_at : Date Object,
     *      company : {
     *          id : 1234,
     *          name : "GoodJob"
     *      }
     *      job_title : "Backend Developer",
     *      sections : [
     *          {subtitle:"XXX",content:"Hello world"}
     *      ],
     *
     *  - reject : ObjectNotExistError/Default Error
     */
    getExperienceById(id) {
        if (!this._isValidId) {
            throw new ObjectNotExistError("該文章不存在");
        }

        const opt = {
            author: 0,
        };
        return this.collection.findOne({
            "_id": new mongo.ObjectId(id),
        }, opt).then((result) => {
            if (result) {
                return result;
            } else {
                throw new ObjectNotExistError("該文章不存在");
            }
        }).catch((err) => {
            throw err;
        });
    }
    _isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }

}

module.exports = ExperienceService;
