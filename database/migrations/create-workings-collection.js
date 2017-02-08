module.exports = (db) => {
    return Promise.all([
        db.collection('workings').createIndex({created_at: 1}),
        db.collection('workings').createIndex({company: 1}),
        db.collection('workings').createIndex({job_title: 1}),
        db.collection('workings').createIndex({week_work_time: 1}),
        db.collection('workings').createIndex({estimated_hourly_wage: 1}),
    ]);
}
