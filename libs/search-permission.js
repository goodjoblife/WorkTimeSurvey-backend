async function getDataNumOfUser(db, user) {
    const result = await db
        .collection("users")
        .findOne({ facebook_id: user.id });

    if (result) {
        return result.time_and_salary_count || 0;
    }
    return 0;
}

async function getRefNumOfUser(db, user) {
    const result = await db.collection("recommendations").findOne({ user });

    if (result) {
        return result.count || 0;
    }
    return 0;
}

async function getExperienceOfUser(db, legacy_user) {
    const facebook_id = legacy_user.id;

    const user = await db.collection("users").findOne({ facebook_id });

    if (user) {
        const result = await db
            .collection("experiences")
            .findOne({ author_id: user._id });
        return result ? 1 : 0;
    }
    return 0;
}

function resolveSearchPermission(db, user) {
    // get required values
    return (
        Promise.all([
            getDataNumOfUser(db, user),
            getRefNumOfUser(db, user),
            getExperienceOfUser(db, user),
        ])
            // determine authorization
            .then(values => {
                const sum = values.reduce((a, b) => a + b);
                return sum > 0;
            })
    );
}

module.exports = {
    getDataNumOfUser,
    getRefNumOfUser,
    resolveSearchPermission,
};
