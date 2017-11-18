class ExperienceHistoryModel {
    constructor(db) {
        this.collection = db.collection("experiences_history");
    }
    /**
     * @param  {object} experience_history - Most of field equals experience model.
     * @param  {string} experience_history.ref_id - it equals experience _id.
     * @param  {updated_at} experience_history.updated_at - update time.
     */
    createExperienceHistory(experience_history) {
        return this.collection.insertOne(experience_history);
    }
}

module.exports = ExperienceHistoryModel;
