const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { ObjectId } = require("mongodb");
const config = require("config");
const secret = config.get("JWT_SECRET");

function jwtStrategy() {
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secret,
        algorithms: "HS256",
        passReqToCallback: true,
    };
    return new JwtStrategy(opts, (req, jwt_payload, done) => {
        const user_id = ObjectId(jwt_payload.user_id);

        const user_model = req.manager.UserModel;

        user_model.findOneById(user_id).then(
            user => {
                if (user) {
                    done(null, user);
                } else {
                    done(null, false);
                }
            },
            err => {
                done(err);
            }
        );
    });
}

module.exports = {
    jwtStrategy,
};
