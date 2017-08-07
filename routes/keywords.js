const express = require('express');

const router = express.Router();
const wrap = require('../libs/wrap');
const HttpError = require('../libs/errors').HttpError;

router.get('/company', wrap(async (req, res, next) => {
    const num = Number(req.query.num);

    if (!Number.isInteger(num)) {
        next(new HttpError('number should be integer', 422));
        return;
    } else if (num < 1 || num > 20) {
        next(new HttpError('number should be 1~20', 422));
        return;
    }

    const collection = req.db.collection('company_keywords');

    let results = await collection.aggregate([
        {
            $group: {
                _id: '$word',
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
        { $limit: num },
    ]).toArray();

    results = results.map(result => result._id);

    res.send(results);
}));

module.exports = router;
