
class ReplyService {

    constructor(db) {
        this.collection = db.collection('replies');
        this.experiences_collection = db.collection('experiences');
    }

}

module.exports = ReplyService;
