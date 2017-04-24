WorkTimeSurvey Backend
=====================

[![Build Status](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend.svg?branch=master)](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend)
[![Coverage Status](https://coveralls.io/repos/github/goodjoblife/WorkTimeSurvey-backend/badge.svg?branch=master)](https://coveralls.io/github/goodjoblife/WorkTimeSurvey-backend?branch=master)

* Environment: nodejs 6
* DB: mongodb, redis

## Contirbution

See our [Contribution Guide](CONTRIBUTING.md)

## Install and Run

### Use docker-compose

```
docker-compose run --rm node npm install
```

```
docker-compose run --rm node npm run migrate
```

```
docker-compose up
```

### 手動跑

```
npm install
```

```
MONGODB_URI=xxx REDIS_URL=yyy npm start
```

`MONGODB_URI` 是 mongodb 的連線網址（例：mongodb://localhost/goodjob），
`REDIS_URL` 是 redis 的連線網址（例：redis://localhost）

## 測試

> 注意：請不要拿正式的資料庫做網址，測試將會清除一切資料
> Notice: The test will clean all the data in db, please DON'T use db in production

```
docker-compose run --rm node npm test
```

```
docker-compose run --rm node npm run lint
```
