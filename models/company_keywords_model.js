
class CompanyKeywordModel {

    constructor(db) {
        this.collection = db.collection('company_keywords');
    }
    createKeyword(word) {
        return this.collection.insertOne({ word });
    }
}

module.exports = CompanyKeywordModel;
