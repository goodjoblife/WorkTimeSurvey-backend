WorkTimeSurvey Backend
=====================

[![Build Status](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend.svg?branch=master)](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend)

* Environment: nodejs 6
* DB: mongo

## Contirbution

See our [Contribution Guide](CONTRIBUTING.md)

## Install and Run

### Use docker-compose

```
npm install
```

```
docker-compose up
```

### Manual

```
npm install
```

```
MONGODB_URI=xxx npm start
```
where xxx is your mongodb url

If you would like to work around with the api, but want to skip the facebook auth, please add `SKIP_FACEBOOK_AUTH=1` to `docker-compose.yml` node env

## Test

> 注意：請不要拿正式的資料庫做網址，測試將會清除一切資料
> Notice: The test will clean all the data in db, please DON'T use db in production

> When you run test, please make sure `SKIP_FACEBOOK_AUTH` is not set on env, or you may receive some error

```
MONGODB_URI=xxx npm test
```
