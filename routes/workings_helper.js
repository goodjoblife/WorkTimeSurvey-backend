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

function calculateEstimatedHourlyWage(working) {
    let estimated_hourly_wage;

    if (working.salary.type === 'hour') {
        estimated_hourly_wage = working.salary.amount;
    } else if (working.day_real_work_time && working.salary.type === 'day') {
        estimated_hourly_wage = working.salary.amount / working.day_real_work_time;
    } else if (working.day_real_work_time && working.week_work_time) {
        if (working.salary.type === 'month') {
            estimated_hourly_wage = (working.salary.amount * 12) /
                                    (52 * working.week_work_time - (12+7) * working.day_real_work_time);
        } else if (working.salary.type === 'year') {
            estimated_hourly_wage = working.salary.amount /
                                    (52 * working.week_work_time - (12+7) * working.day_real_work_time);
        }
    }

    return estimated_hourly_wage;
}

module.exports = {
    normalizeCompany,
    checkAndUpdateQuota,
    calculateEstimatedHourlyWage,
};
