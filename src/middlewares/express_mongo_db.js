const { connectMongo } = require("../models/connect");

module.exports = function() {
    let _p;

    return function expressMongoDb(req, res, next) {
        if (!_p) {
            _p = connectMongo();
        }

        _p.then(({ db }) => {
            req.db = db;
            next();
        }).catch(err => {
            _p = undefined;
            next(err);
        });
    };
};
