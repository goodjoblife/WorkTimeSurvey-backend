
class ExperienceService {

    constructor(db) {
        this.collection = db.collection('experiences');
    }

}

module.exports = ExperienceService;
