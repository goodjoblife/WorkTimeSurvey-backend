module.exports = (db) => {
    return db.collection('authors').find().toArray()
        .then((authors) => {
            const user_collection = db.collection('users');

            const users = authors.map(author => {
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

                return user;
            });

            return user_collection.insertMany(users);
        });
};
