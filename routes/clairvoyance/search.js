const express = require('express');
const router = express.Router();
const HttpError = require('../../libs/errors').HttpError;
const lodash = require('lodash');
const winston = require('winston');

router.get('/by-job', function(req, res, next) {
	next();
	winstom.info('/clairvoyance/search/by-job', {job: req.query.job, ip: req.ip, ips: req.ips});
	
	const job = req.query.job;
	const page = req.query.page || 0;

	const collection = req.db.collection('workings');
	
	if(!job || job === '')
		throw new HttpError("job is required", 422);

	//mongodb query
	const db_query = {
		$or: [
			{des: new RegExp(lodash.escapeRegExp(job.toUpperCase() ) ) },
		]
	};
	
	//sorted order
	const db_sort = {
		created_at: -1	
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
		
		return collection.find(db_query, opt).sort(db_sort).skip(25 * page).limit.toArray();
	}).then(function(workings){
		data.page = page;
		data.workings = workings;
	
		res.send(data);
	}).catch(function(err){
		new HttpError("Internal Server Error", 500);
	});

});

router.get('/by-company', function(req, res, next) {
    next();
});

module.exports = router;
