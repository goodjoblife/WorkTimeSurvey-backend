function _getCompanyName(db_company_name) {
    if (Array.isArray(db_company_name)) {
        return _getCompanyName(db_company_name[0]);
    }
    return db_company_name;
}

module.exports = db =>
    db
        .collection("workings")
        .find(
            {
                "company.name": { $exists: true },
            },
            {
                "company.name": 1,
            }
        )
        .toArray()
        .then(data => {
            const promise_arr = [];
            for (const d of data) {
                const company_name = _getCompanyName(d.company.name);
                if (company_name !== d.company.name) {
                    promise_arr.push(
                        db.collection("workings").updateOne(
                            {
                                _id: d._id,
                            },
                            {
                                $set: {
                                    "company.name": company_name,
                                },
                            }
                        )
                    );
                }
            }
            return Promise.all(promise_arr);
        });
