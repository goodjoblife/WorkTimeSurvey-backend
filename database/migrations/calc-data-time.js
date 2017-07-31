module.exports = (db) => db.collection('workings').find({}, { created_at: 1 }).toArray()
        .then((data) => {
            let promise_queue = Promise.resolve();
            for (let i = 0; i < data.length; i += 1) {
                const date = new Date(data[i].created_at);
                const data_time = {
                    year: date.getFullYear(),
                    month: date.getMonth() + 1,
                };
                promise_queue = promise_queue.then(() => db.collection('workings').update({ _id: data[i]._id }, { $set: { data_time } }));
            }
            return promise_queue;
        });
