const ObjectId = require('mongodb').ObjectId;

function getRecommendationString(db, user) {
    return db.collection('recommendations')
        .findOneAndUpdate({
            user: user,
        }, {
            // when insert, insert the user field
            $set: {user: user},
        }, {
            // insert if not found
            upsert: true,
            // 返回改過的物件
            returnOriginal: false,
        })
        .then(result => {
            // result.value._id --> ObjectId
            // we want to get string
            return result.value._id.toHexString();
        });
}

function getUserByRecommendationString(db, recommendation_string) {
    return Promise.resolve()
        .then(() => {
            if (typeof recommendation_string !== 'string') {
                throw new Error('recommendation_string should be a string');
            }
            // new ObjectId may throw error
            return new ObjectId(recommendation_string);
        })
        .then(_id => db.collection('recommendations').findOne({_id: _id}))
        .then(result => {
            if (result === null) {
                return null;
            } else {
                return result.user;
            }
        });
}

module.exports = {
    getRecommendationString,
    getUserByRecommendationString,
};
