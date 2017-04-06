const mongo = require('mongodb');
const lodash = require('lodash');
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ObjectError = require('../libs/errors').ObjectError;

class ExperienceService {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

    /**
     * 使用 query 來尋找文章
     * @param {object} query - {
     *  search_query : "goodjob",
     *  search_by : "company",
     *  sort : "created_at",
     *  page : 0,
     *  limit : 20
     *  type : "interview"
     * }
     * @returns {Promise}
     *  - resolved : {
     *      total_pages : 10,
     *      page : 1,
     *      experiences : [
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
     *      ]
     *  }
     *  - reject : ObjectError / Default Error;
     */
    getExperiencesByQuery(query) {
        if (!this._isValidSearchByField(query.search_by)) {
            return Promise.reject(new ObjectError("search by 格式錯誤"));
        }
        const sort_field = query.sort || "created_at";
        if (!this._isValidSortField(sort_field)) {
            return Promise.reject(new ObjectError("sort by 格式錯誤"));
        }

        const opt = {
            author: 0,
            education: 0,
        };
        const find_query = this._queryToDBQuery(query.search_query, query.search_by);
        const sort_by = {};
        sort_by[sort_field] = -1;
        const page = parseInt(query.page) || 0;
        const limit = query.limit || 25;

        let result = {};
        result.page = page;
        return this.collection.find(find_query, {
            "_id": 1,
        }).count().then((count) => {
            result.total_pages = Math.ceil(count / limit);
            return this.collection.find(find_query, opt).sort(sort_by).skip(limit * page).limit(limit).toArray();
        }).then((docs) => {
            result.experiences = docs;
            return result;
        }).catch((err) => {
            throw err;
        });

    }
    _isValidSearchByField(search_by) {
        if (!search_by) {
            return true;
        }
        const Default_Field = ["company", "job_title"];
        return Default_Field.includes(search_by);
    }
    _isValidSortField(sort_by) {
        if (!sort_by) {
            return true;
        }
        const Default_Field = ["created_at", "job_title"];
        return Default_Field.includes(sort_by);
    }
    _queryToDBQuery(search_query, search_by) {
        let query = {};
        if (!(search_by && search_query)) {
            return query;
        }

        if (search_by == "company") {
            query["$or"] = [{
                'company.name': new RegExp(lodash.escapeRegExp(search_query.toUpperCase())),
            }, {
                'company.id': search_query,
            }];
        } else if (search_by == "job_title") {
            query.job_title = new RegExp(lodash.escapeRegExp(search_query.toUpperCase()));
        }
        return query;
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
