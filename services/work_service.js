
const ObjectError = require('../libs/errors').ObjectError;

class WorkService {

    constructor(db) {
        this.collection = db.collection('companies');
    }
    searchCompanyById(id) {
        return this.collection.find({
            id: id,
        }).toArray();
    }
    searchCompanyByName(name) {
        return this.collection.find({
            name: name,
        }).toArray();
    }

}

module.exports = WorkService;
