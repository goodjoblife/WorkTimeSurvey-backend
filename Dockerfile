FROM node:8

COPY . /app

WORKDIR /app

ENV NODE_ENV=production MONGODB_URI=mongodb://mongo/goodjob REDIS_URL=redis://redis

RUN yarn install

EXPOSE 3000

CMD ["npm", "run", "start"]
