const HttpError = require('../../libs/errors').HttpError;

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
    const collection = db.collection('users');
    const quota = 5;

    const provider = `${author.type}_id`;

    const filter = {
        [provider]: author.id,
    };

    function increment() {
        return collection.findOneAndUpdate(
            filter,
            {
                $inc: { time_and_salary_count: 1 },
            },
            {
                upsert: true,
                returnOriginal: false,
            }
        );
    }

    function decrementWithoutError() {
        return collection.updateOne(filter, { $inc: { time_and_salary_count: -1 } })
            .catch(() => {});
    }

    return increment()
        .catch((err) => {
            if (err.code === 11000) { // E11000 duplicate key err
                return increment();
            }

            throw new HttpError(`上傳資料發生點問題`, 500);
        })
        .then((result) => {
            if (result.value.time_and_salary_count > quota) {
                return decrementWithoutError()
                    .then(() => {
                        throw new HttpError(`您已經上傳${quota}次，已達最高上限`, 429);
                    });
            }

            return result.value.time_and_salary_count;
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
                                    (
                                     (52 * working.week_work_time) -
                                     ((12 + 7) * working.day_real_work_time));
        } else if (working.salary.type === 'year') {
            estimated_hourly_wage = working.salary.amount /
                                    ((52 * working.week_work_time) -
                                     ((12 + 7) * working.day_real_work_time));
        }
    }

    return estimated_hourly_wage;
}

module.exports = {
    checkAndUpdateQuota,
    calculateEstimatedHourlyWage,
};
