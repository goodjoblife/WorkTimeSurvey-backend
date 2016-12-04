function redisLookUp(user_id){
  return new Promise((resolve, reject) => {
    if(user_id){
      resolve();
    }
    else{
      reject("Facebook ID not found in Redis");
    }
  });
}

function getDataNumOfUser(user_id){
  return new Promise((resolve, reject) => {
    if(user_id){
      resolve();
    }
    else{
      reject("Facebook ID not found in Redis");
    }
  });
}

function getRefNumOfUser(user_id){
  return new Promise((resolve, reject) => {
    if(user_id){
      resolve();
    }
    else{
      reject("Facebook ID not found in Redis");
    }
  });
}

function hasSearchPermission(user_id){
  // get required values
  return Promise.all([
    getDataNumOfUser(user_id),
    getRefNumOfUser(user_id),
  ])
  // determine authorization
  .then(values => {
    let sum = values.reduce((a,b) => a+b);
    if(sum > 0) Promise.resolve();
    else Promise.reject("User does not meet authorization level");
  },
  Promise.reject);
}

module.exports = (user_id, next) => {
  // redis look up
  redisLookUp(user_id).
  // proceed if user found in cache
  then(Promise.resolve,
  err => {
    // validate user if user not found in cache
    return hasSearchPermission(user_id)
    // write authorized user into cache for later access
    .then(() => {
      return redisInsert(user_id);
    },
    Promise.reject)
  },
  Promise.reject)
  // proceed or throw error
  .then(() => {
    next();
  },
  err => {
    throw new HTTPError(401, err);
  })
};
