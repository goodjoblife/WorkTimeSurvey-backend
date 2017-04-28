module.exports = (db) => {
    return db.collection('authors').find().toArray()
        .then((authors) => {
            const user_collection = db.collection('users');

            let promise_chain = Promise.resolve();

            for (let author of authors) {
                const time_and_salary_count = author.queries_count;
                const id = author._id.id;

                // current provider is 'facebook' ONLY
                const provider = author._id.type;

                const user = {
                    facebook_id: id,
                }

                if (time_and_salary_count) {
                    user.time_and_salary_count = time_and_salary_count;
                }

                promise_chain.then(() => {
                    return user_collection.insertOne(user);
                });
            }

            return promise_chain;
        });
};
