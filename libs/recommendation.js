const ObjectId = require('mongodb').ObjectId;
const ObjectIdError = require('./errors').ObjectIdError;

/*
 * 取得使用者的推薦字串
 *
 * @param db   mongo db
 * @param user {id, type}
 *
 * @fulfilled HexString of ObjectId
 * @rejected  error
 */
function getRecommendationString(db, user) {
    return db.collection('recommendations')
        .findOneAndUpdate({
            user,
        }, {
            // when insert, insert the user field
            $set: { user },
        }, {
            // insert if not found
            upsert: true,
            // 返回改過的物件
            returnOriginal: false,
        })
        .then(result =>
            // result.value._id --> ObjectId
            // we want to get string
            result.value._id.toHexString());
}

/*
 * 根據推薦字串取得使用者
 *
 * @param db                    mongo db
 * @param recommendation_string string
 *
 * @fulfilled user {id, type} || null
 * @rejected  error
 *
 * @Error         recommendation_string 不是字串
 * @ObjectIdError recommendation_string 不合法
 * @Error         其它錯誤
 */
function getUserByRecommendationString(db, recommendation_string) {
    return Promise.resolve()
        .then(() => {
            if (typeof recommendation_string !== 'string') {
                throw new Error('recommendation_string should be a string');
            }
            if (!ObjectId.isValid(recommendation_string)) {
                throw new ObjectIdError("recommendation_string is not a valid string for ObjectId");
            }
            // new ObjectId may throw error
            return new ObjectId(recommendation_string);
        })
        .then(_id => db.collection('recommendations').findOne({ _id }))
        .then((result) => {
            if (result === null) {
                return null;
            }
            return result.user;
        });
}

module.exports = {
    getRecommendationString,
    getUserByRecommendationString,
};
