/*
 * ExperienceLike {
 *   _id            : ObjectId!
 *   created_at     : Date!
 *   user_id        : ObjectId!
 *   experience_id  : ObjectId!
 * }
 */

class ExperienceLikeModel {
    constructor(manager) {
        this.manager = manager;
        this.collection = manager.db.collection("experience_likes");
    }

    async getLikeByExperienceAndUser(experience_id, user) {
        const user_id = user._id;

        return await this.collection.findOne({
            experience_id,
            user_id,
        });
    }
}

module.exports = ExperienceLikeModel;
