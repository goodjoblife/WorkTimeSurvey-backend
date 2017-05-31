module.exports = (db) => {
    return db.collection('workings').updateMany({
        estimated_hourly_wage: {
            $exists: true,
            $eq: null,
        }
    }, {
        $unset: {
            estimated_hourly_wage: '',
        }
    });
};
