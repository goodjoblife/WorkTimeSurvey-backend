const HttpError = require('../libs/errors').HttpError;

function searchCompanyById(db, id) {
    return db.collection('companies').find({
        id: id,
    }).toArray();
}

function searchCompanyByName(db, name) {
    return db.collection('companies').find({
        name: name,
    }).toArray();
}

/*
 * 如果使用者有給定 company id，將 company name 補成查詢到的公司
 *
 * 如果使用者是給定 company query，如果只找到一間公司，才補上 id
 *
 * 其他情況看 issue #7
 */
function normalizeCompany(db, company_id, company_query) {
    if (company_id) {
        return searchCompanyById(db, company_id).then(results => {
            if (results.length === 0) {
                throw new HttpError("公司統編不正確", 422);
            }

            return {
                id: company_id,
                name: results[0].name,
            };
        });
    } else {
        return searchCompanyById(db, company_query).then(results => {
            if (results.length === 0) {
                return searchCompanyByName(db, company_query.toUpperCase()).then(results => {
                    if (results.length === 1) {
                        return {
                            id: results[0].id,
                            name: results[0].name,
                        };
                    } else {
                        return {
                            name: company_query.toUpperCase(),
                        };
                    }
                });
            } else {
                return {
                    id: results[0].id,
                    name: results[0].name,
                };
            }
        });
    }
}

/*
 * Check the quota, limit queries <= 5
 *
 * The quota checker use author as _id
 *
 * @return  Promise
 *
 * Fullfilled with newest queries_count
 * Rejected with HttpError
 */
function checkAndUpdateQuota(db, author) {
    const collection = db.collection('authors');
    const quota = 5;

    return collection.findAndModify(
        {
            _id: author,
            queries_count: {$lt: quota},
        },
        [
        ],
        {
            $inc: { queries_count: 1 },
        },
        {
            upsert: true,
            new: true,
        }
    ).then(result => {
        if (result.value.queries_count > quota) {
            throw new HttpError(`您已經上傳${quota}次，已達最高上限`, 429);
        }

        return result.value.queries_count;
    }, err => {
        throw new HttpError(`您已經上傳${quota}次，已達最高上限`, 429);
    });

}

module.exports = {
    normalizeCompany,
    checkAndUpdateQuota,
};
