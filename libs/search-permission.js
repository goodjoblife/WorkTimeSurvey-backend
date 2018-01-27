function getDataNumOfUser(db, user) {
    return db
        .collection("users")
        .findOne({ facebook_id: user.id })
        .then(result => (result ? result.time_and_salary_count : 0));
}

function getRefNumOfUser(db, user) {
    return db
        .collection("recommendations")
        .findOne({ user })
        .then(result => (result ? result.count : 0));
}

function getExperienceOfUser(db, user) {
    return db
        .collection("experiences")
        .findOne({ "author._id": user.id })
        .then(result => (result ? 1 : 0));
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
