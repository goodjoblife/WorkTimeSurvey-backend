GoodJob 好工作評論網 後端網站 API
=================================

[![Build Status](https://circleci.com/gh/goodjoblife/WorkTimeSurvey-backend.svg?style=shield)](https://circleci.com/gh/goodjoblife/WorkTimeSurvey-backend)
[![Build Status](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend.svg?branch=master)](https://travis-ci.org/goodjoblife/WorkTimeSurvey-backend)
[![Coverage Status](https://coveralls.io/repos/github/goodjoblife/WorkTimeSurvey-backend/badge.svg?branch=master)](https://coveralls.io/github/goodjoblife/WorkTimeSurvey-backend?branch=master)
[![License](https://img.shields.io/github/license/goodjoblife/WorkTimeSurvey-backend.svg)](https://github.com/goodjoblife/WorkTimeSurvey-backend/blob/master/LICENSE)

分享你的工時薪資，面試與工作經驗，讓我們一起改善工作資訊不透明的現況

立刻前往 --> https://www.goodjob.life

* Environment: nodejs 8
* DB: mongodb >= 3.6, redis

## Contirbution

See our [Contribution Guide](CONTRIBUTING.md)

## Install and Run

### Use docker-compose

```sh
docker-compose run --rm node yarn install
```

```sh
docker-compose run --rm node npm run migrate
```

```sh
docker-compose up
```

`MONGODB_URI` 是 mongodb 的連線網址（例：mongodb://localhost/goodjob），
`REDIS_URL` 是 redis 的連線網址（例：redis://localhost）

## 測試

> 注意：請不要拿正式的資料庫做網址，測試將會清除一切資料
> Notice: The test will clean all the data in db, please DON'T use db in production

測試所有程式碼
```sh
docker-compose run --rm node npm test
```

單獨測試一個 testing file
```sh
docker-compose run --rm node npm run test:one FILE_PATH
```

測試所有 coding style
```sh
docker-compose run --rm node npm run lint
docker-compose run --rm node npm run lint:fix
```

## API documentation
- [master branch](https://goodjoblife.github.io/WorkTimeSurvey-backend/master/)
- [dev branch](https://goodjoblife.github.io/WorkTimeSurvey-backend/dev/)
