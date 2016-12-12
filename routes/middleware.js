
function sort_by(req, res, next) {
    req.sort_by = req.params.SORT_FIELD;
    next();
}

function group_by(req, res, next) {
    // to do
    next();
}

function group_sort_by(req, res, next) {
    // to do
    next();
}

function search_by(req, res, next) {
    // to do
    next();
}

module.exports = {
    sort_by,
    group_by,
    group_sort_by,
    search_by,
};
