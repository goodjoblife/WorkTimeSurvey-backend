async function getDataNumOfUser(db, user_id) {
    const result = await db.collection("users").findOne({ _id: user_id });

    if (result) {
        return result.time_and_salary_count || 0;
    }
    return 0;
}

async function getRefNumOfUser(db, user_id) {
    const user = await db.collection("users").findOne({ _id: user_id });
    if (!user) {
        return 0;
    }
    if (!user.facebook_id) {
        return 0;
    }
    const result = await db
        .collection("recommendations")
        .findOne({ user: { id: user.facebook_id, type: "facebook" } });

    if (result) {
        return result.count || 0;
    }
    return 0;
}

async function getExperienceOfUser(db, user_id) {
    const result = await db
        .collection("experiences")
        .findOne({ author_id: user_id });
    return result ? 1 : 0;
}

function resolveSearchPermission(db, user_id) {
    // get required values
    return (
        Promise.all([
            getDataNumOfUser(db, user_id),
            getRefNumOfUser(db, user_id),
            getExperienceOfUser(db, user_id),
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
