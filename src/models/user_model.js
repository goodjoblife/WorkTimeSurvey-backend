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

    async create({ name, facebook_id, facebook, email }) {
        const new_user = {
            name,
            facebook_id,
            facebook,
            email,
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
