module.exports = async (db) => {
    const workings = await db.collection('workings').find().toArray();

    let migratted_count = 0;

    for (const working of workings) {
        if (working.author && working.author.name) {
            const facebook_id = working.author.id;
            const name = working.author.name;

            // eslint-disable-next-line no-await-in-loop
            const user = await db.collection('users').findOne({ facebook_id });

            if (!user) {
                console.log('working author not found in users collection', working);
            } else if (user.facebook) {
                // do nothing
            } else {
                // eslint-disable-next-line no-await-in-loop
                await db.collection('users').updateOne(
                    { facebook_id },
                    {
                        $set: {
                            facebook: {
                                id: facebook_id,
                                name,
                            },
                        },
                    }
                );

                migratted_count += 1;
            }
        }
    }
    console.log('total', workings.length, 'migratted', migratted_count);
};
