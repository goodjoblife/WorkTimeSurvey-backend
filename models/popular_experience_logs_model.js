
class PopularExperienceLogsModel {
    constructor(db) {
        this.collection = db.collection('popular_experience_logs');
    }

    insertLog({ experience_id, user, action_type, value }) {
        return this.collection.insertOne({ experience_id, user_id: user._id, action_type, value });
    }
}

module.exports = PopularExperienceLogsModel;
