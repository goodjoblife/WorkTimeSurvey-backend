module.exports = (db) => {
    return db.collection('workings').find({}, { created_at: 1 }).toArray()
        .then((data) => {
            const promiseStack = [];
            for (let i = 0; i < data.length; i++) {
                const date = new Date(data[i].created_at);
                const data_time = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                };
                promiseStack.push(db.collection('workings').update({ _id: data[i]._id }, { $set: { data_time: data_time }}));
            }
            return Promise.all(promiseStack);
        });
};
