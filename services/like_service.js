const mongo = require('mongodb');

class LikeService {

    constructor(db) {
        this.collection = db.collection('likes');
        this.repliesCollection = db.collection('replies');
        this.experienceCollection = db.collection('experiences');
    }

}

module.exports = LikeService;
