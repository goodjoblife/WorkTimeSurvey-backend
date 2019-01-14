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

    async create({ facebook_id, facebook }) {
        const new_user = {
            facebook_id,
            facebook,
        };

        await this.collection.insertOne(new_user);
        return new_user;
    }
}

module.exports = UserModel;
