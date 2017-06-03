const DuplicateKeyError = require('../libs/errors').DuplicateKeyError;
const ObjectNotExistError = require('../libs/errors').ObjectNotExistError;
const ExperienceModel = require('./experience_model');
const ObjectId = require('mongodb').ObjectId;

class ExperienceLikeModel {

    constructor(db) {
        this.collection = db.collection('experience_likes');
        this._db = db;
    }

    /**
     * 新增讚至一篇經驗
     * @param {string} experience_id - experience's id
     * @param {User} user - associated user
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
                user_id: user._id,
                created_at: new Date(),
                experience_id: new ObjectId(experience_id),
            };
            return this.collection.insertOne(data);
        }).then((result) => {
            return result.insertedId;
        }).catch((err) => {
            if (err.code === 11000) { //E11000 duplicate key error
                throw new DuplicateKeyError("該篇文章已經被按讚");
            } else {
                throw err;
            }
        });
    }

    /**
     * delete like by experience_id and user
     * @param {string} experience_id - experience id
     * @param {User} user - user object
     * @returns {promise}
     *  - resolve : true
     *  - reject : DuplicateKeyError/Default Error
     */
    deleteLike(experience_id, user) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.deleteOne({
                experience_id: new ObjectId(experience_id),
                user_id: user._id,
            });
        }).then((result) => {
            if (result.deletedCount == 0) {
                throw new ObjectNotExistError("此讚不存在");
            } else {
                return true;
            }
        });
    }

    /**
     * Get Likes by experience_id
     *
     * @param {string} experience_id
     * @param {id, type} user
     * @returns {Promise} -
     *  - resolve: Like[]
     *  Like: {
     *    _id: ObjectId,
     *    created_at: Date,
     *    user_id: ObjectId,
     *    experience_id: ObjectId,
     *  }
     */
    getLikeByExperienceIdAndUser(experience_id, user) {
        const experience_model = new ExperienceModel(this._db);
        return experience_model.isExist(experience_id).then((is_exist) => {
            if (!is_exist) {
                throw new ObjectNotExistError("該篇文章不存在");
            }

            return this.collection.findOne({
                experience_id: new ObjectId(experience_id),
                user_id: user._id,
            });
        }).then((likes) => {
            return likes;
        });
    }
}

module.exports = ExperienceLikeModel;
