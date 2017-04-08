const HttpError = require('../libs/errors').HttpError;

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
    checkAndUpdateQuota,
    calculateEstimatedHourlyWage,
};
