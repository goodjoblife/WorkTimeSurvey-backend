const mongo = require('mongodb');

class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experienceCollection = db.collection('experiences');
    }

}

module.exports = ReplyService;
