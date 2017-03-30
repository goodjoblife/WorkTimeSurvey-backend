
class LikeService {

    constructor(db) {
        this.collection = db.collection('likes');
        this.replies_collection = db.collection('replies');
        this.experiences_collection = db.collection('experiences');
    }

}

module.exports = LikeService;
