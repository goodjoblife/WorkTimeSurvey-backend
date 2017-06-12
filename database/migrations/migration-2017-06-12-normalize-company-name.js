function _getCompanyName(db_company_name) {
    if (Array.isArray(db_company_name)) {
        return _getCompanyName(db_company_name[0]);
    } else {
        return db_company_name;
    }
}

module.exports = (db) => {
    return db.collection('workings').find({ 
        "company.name": { $exists: true },
    }, {
        "company.name": 1,
    }).toArray().then((data) => {
        const promiseArr = [];
        for (const d of data) {
            const companyName = _getCompanyName(d.company.name);
            if (companyName !== d.company.name) {
                promiseArr.push(db.collection('workings').updateOne({
                    '_id': d._id,
                }, {
                    $set: {
                        "company.name": companyName,
                    }
                }));
            }
        }
        return Promise.all(promiseArr);
    });
};
