const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');

router.get('/by-job', function(req, res, next) {
    winston.info('/clairvoyance/search/by-job', {job_title: req.query.job_title, ip: req.ip, ips: req.ips});
    const job_title = req.query.job_title;
    const page = req.query.page || 0;

    const collection = req.db.collection('workings');
    
    if(!job_title || job_title === ''){
        next(new HttpError("job_title is required", 422));
        return;
    }
    
    //mongodb query
    const db_query = {
        job_title: new RegExp(lodash.escapeRegExp(job_title.toUpperCase() ) ),
    };
	
    //sorted order
    const db_sort = {
        created_at: -1,	
    };
	
    //display fields
    const opt = {
        _id: 0,
        job_title: 1,
        company: 1,
        created_at: 1,
        week_work_time: 1,
    };
	
    const data = {};

    collection.find(db_query).count().then(function(count){
        data.total_count = count;
        data.total_page = Math.ceil(count / 25);
		
        return collection.find(db_query, opt).sort(db_sort).skip(25 * page).limit(25).toArray();
    }).then(function(workings){
        data.page = page;
        data.workings = workings;
	
        res.send(data);
    }).catch(function(err){
        next(new HttpError("Internal Server Error", 500));
    });

});

router.get('/by-company', function(req, res, next) {
    next();
});

module.exports = router;
