const express = require('express');

const router = express.Router();
const wrap = require('../../../libs/wrap');
const generateGetWorkingsViewModel = require('../../../view_models/get_workings');
const passport = require('passport');
const WorkingModel = require('../../../models/working_model');


router.get('/', [
    passport.authenticate('bearer', { session: false }),
    wrap(async (req, res) => {
        const user = req.user;
        const query = {
            "author.id": user.facebook_id,
        };

        const working_model = new WorkingModel(req.db);
        const count = await working_model.getWorkingsCountByQuery(query);
        const workings = await working_model.getWorkings(query);

        res.send(generateGetWorkingsViewModel(workings, count));
    })]
);

module.exports = router;
