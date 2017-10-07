class ExperienceHistoryModel {
    constructor(db) {
        this.collection = db.collection("experiences_history");
    }

    createExperienceHistory(old_experience) {
        return this.collection.insertOne(old_experience);
    }
}

module.exports = ExperienceHistoryModel;
