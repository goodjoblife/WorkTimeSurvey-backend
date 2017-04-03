const mongo = require('mongodb');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

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
        if (!this._isValidId(id)) {
            return Promise.reject(new ObjectNotExistError("該文章不存在"));
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
