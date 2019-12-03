const Joi = require("joi");
/*
 * User {
 *   _id            : ObjectId!
 *   facebook_id    : String!
 *   facebook       : Object
 * }
 */

class UserModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("users");
    }

    async findOneById(_id) {
        const user = await this.collection.findOne({ _id });
        return user;
    }

    async findOneByFacebookId(facebook_id) {
        const user = await this.collection.findOne({ facebook_id });
        return user;
    }

    async findOneByGoogleId(google_id) {
        const user = await this.collection.findOne({ google_id });
        return user;
    }

    async create(user) {
        const userSchema = Joi.object()
            .keys({
                name: Joi.string()
                    .min(1)
                    .required(),
                facebook_id: Joi.string(),
                facebook: Joi.object(),
                google_id: Joi.string(),
                google: Joi.object(),
                email: Joi.string()
                    .email()
                    .required(),
            })
            // facebook_id & facebook 這兩個欄位必須同時存在
            .and("facebook_id", "facebook")
            // google_id & google 這兩個欄位必須同時存在
            .and("google_id", "google")
            // facebook_id & google_id 其中一個欄位必須存在
            .or("facebook_id", "google_id");

        const result = Joi.validate(user, userSchema);
        if (result.error !== null) {
            throw Error(result.error);
        }

        const new_user = {
            ...user,
            email_status: "UNVERIFIED",
        };

        await this.collection.insertOne(new_user);
        return new_user;
    }

    // 假設 email 存在，更新該使用者的 email 欄位，
    // 並將 subscribeEmail 欄位設為 true
    async updateSubscribeEmail(_id, email) {
        if (email) {
            await this.collection.updateOne(
                { _id },
                {
                    $set: {
                        email,
                        subscribeEmail: true,
                    },
                }
            );
        }
    }
}

module.exports = UserModel;
module.exports.UNVERIFIED = "UNVERIFIED";
module.exports.SENT_VERIFICATION_LINK = "SENT_VERIFICATION_LINK";
module.exports.VERIFIED = "VERIFIED";
