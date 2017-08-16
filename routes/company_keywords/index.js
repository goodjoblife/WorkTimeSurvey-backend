const express = require('express');

const router = express.Router();
const wrap = require('../../libs/wrap');
const { HttpError } = require('../../libs/errors');
const { requiredNumberInRange } = require('../../libs/validation');

router.get('/', wrap(async (req, res, next) => {
    const num = Number(req.query.num);

    if (!Number.isInteger(num)) {
        throw new HttpError('number should be integer', 422);
    } else if (!requiredNumberInRange(num, 20, 1)) {
        throw new HttpError('number should be 1~20', 422);
    }

    const collection = req.db.collection('company_keywords');

    const results = await collection.aggregate([
        {
            $group: {
                _id: '$word',
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1 } },
        { $limit: num },
    ]).toArray();

    const keywords = {
        keywords: results.map(result => result._id),
    };

    res.send(keywords);
}));

module.exports = router;
