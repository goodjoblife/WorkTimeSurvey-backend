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
        };

        await this.collection.insertOne(new_user);
        return new_user;
    }
}

module.exports = UserModel;
