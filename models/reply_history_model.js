class ReplyHistoryModel {
    constructor(db) {
        this.collection = db.collection("replies_history");
    }

    createReplyHistory(old_reply) {
        return this.collection.insertOne(old_reply);
    }
}

module.exports = ReplyHistoryModel;
