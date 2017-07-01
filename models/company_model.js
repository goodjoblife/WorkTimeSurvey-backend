class CompanyModel {

    constructor(db) {
        this.collection = db.collection('companies');
    }
    searchCompanyById(id) {
        return this.collection.find({
            id,
        }).toArray();
    }
    searchCompanyByName(name) {
        return this.collection.find({
            name,
        }).toArray();
    }
    searchCompany(query, sort_by, skip, limit) {
        return this.collection.find(query)
            .sort(sort_by)
            .skip(skip)
            .limit(limit)
            .toArray();
    }

}

module.exports = CompanyModel;
