const R = require("ramda");
const combineSelector = R.converge(R.unapply(R.mergeAll));

module.exports = {
    combineSelector,
};
