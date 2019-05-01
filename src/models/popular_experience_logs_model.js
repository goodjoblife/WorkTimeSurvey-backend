class PopularExperienceLogsModel {
    constructor(db) {
        this.collection = db.collection("popular_experience_logs");
    }

    insertLog({ experience_id, user_id, action_type }) {
        const log = { experience_id, user_id, action_type };
        return this.collection.updateOne(
            log,
            { $setOnInsert: log },
            { upsert: true }
        );
    }
}

module.exports = PopularExperienceLogsModel;
