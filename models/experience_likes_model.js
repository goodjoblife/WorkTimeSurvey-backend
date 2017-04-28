const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ExperienceModel = require('./experience_model');

class ExperienceLikeModel {

    constructor(db) {
        this.collection = db.collection('experience_likes');
        this.replies_collection = db.collection('replies');
        this._db = db;
    }
    /**
     * 新增讚至一篇文章
     * @param {string} experience_id - experience's id
     * @param {object} user -
     * {
     *  id : "xxxxx",
     *  type : "facebook",
     * }
     * @returns {Promise}
     *  - resolved : "xxxxx" (like's id)
     *  - reject : ObjectNotExistError / Default Error
     */
    createLike(experience_id, user) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            const data = {
                user: user,
                created: new Date(),
                experience_id: experience_id,
            };
            return this.collection.insertOne(data);
        }).then((result) => {
            return result.insertedId;
        }).catch((err) => {
            if (err.code === 11000) {  //E11000 duplicate key error
                throw new DuplicateKeyError("該篇文章已經被按讚");
            } else {
                throw err;
            }
        });
    }
}

module.exports = ExperienceLikeModel;
