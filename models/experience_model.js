const mongo = require('mongodb');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;

class ExperienceModel {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

    /**
     * 使用 query 來尋找文章
     * @param {object} query - mongodb find query
     * @param {object} sort  - {created_at: 1}
     * @param {number} skip  - 0
     * @param {number} limit - 20
     *
     * @returns {Promise}
     *  - resolved :
     *  [
     *          {
     *              _id : ObjectId,
     *              type : interview/work,
     *              created_at : new Date(),
     *              company : {
     *                  id : 12345678,
     *                  name : "GoodJob"
     *              },
     *              sections : [
     *                  { subtitle : "abc",content:"hello" }
     *              ]
     *              job_title : "Backend Developer",
     *              title : "hello world",
     *              preview : "XXXXXXX"
     *              like_count : 0,
     *              reply_count : 0,
     *          }
     *  ]
     *  - reject :  Default Error;
     */
    getExperiences(query, sort, skip = 0, limit = 25) {
        const opt = {
            author: 0,
            education: 0,
            experience_in_year: 0,
            interview_time: 0,
            interview_qas: 0,
            interview_result: 0,
            interview_sensitive_questions: 0,
        };

        return this.collection.find(query, opt).sort(sort).skip(skip).limit(limit).toArray()
            .then((docs) => {
                return docs;
            });
    }

    /**
     * 取得搜尋的文章總數
     * @param   {object}  query - mognodb find query
     * @returns {Promise}
     *  - resolved : 10 (Number)
     */
    getExperiencesCountByQuery(query) {
        return this.collection.find(query, {
            _id: 1,
        }).count();
    }

    /**
     * 使用 experience _id 來取得單篇文章
     * @param   {string}  id - experience_id
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
            _id: new mongo.ObjectId(id),
        }, opt).then((result) => {
            if (result) {
                return result;
            } else {
                throw new ObjectNotExistError("該文章不存在");
            }
        });
    }

    _isValidId(id) {
        return (id && mongo.ObjectId.isValid(id));
    }

    /**
     * 用來驗證要留言的文章是否存在
     * @param  {string}  id - experience _id
     * @return {Promise}
     *  - resolved : true/false
     *  - reject : Default error
     */
    isExist(id) {
        if (!mongo.ObjectId.isValid(id)) {
            return Promise.resolve(false);
        }

        return this.collection.findOne({
            _id: new mongo.ObjectId(id),
        }, {
            _id: 1,
        }).then((result) => {
            if (result) {
                return true;
            } else {
                return false;
            }
        });
    }

    createExperience(experience) {
        return this.collection.insertOne(experience);
    }

    /**
     * 使用experience Id 來取得單篇文章
     * @param   {string} id - erperiences's id
     * @returns {Promise}
     *  - resolved : {
     *        value: {
     *            reply_count: Current Reply Count (after increment 1)
     *        }
     *    }
     *
     *  - reject : ObjectNotExistError/Default Error
     */
    incrementReplyCount(id) {
        if (!mongo.ObjectId.isValid(id)) {
            throw new ObjectNotExistError("該文章不存在");
        }

        return this.collection.findOneAndUpdate({_id: new mongo.ObjectId(id)},
            {
                $inc: {
                    reply_count: 1,
                },
            },
            {
                projection: {
                    reply_count: 1,
                },
                returnOriginal: false,
            }
        );
    }
}

module.exports = ExperienceModel;
