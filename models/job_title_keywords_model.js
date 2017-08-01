
class JobTitleKeyWordModel {

    constructor(db) {
        this.collection = db.collection('job_title_keywords');
    }
    createKeyword(word) {
        return this.collection.insertOne({ word });
    }
}

module.exports = JobTitleKeyWordModel;
