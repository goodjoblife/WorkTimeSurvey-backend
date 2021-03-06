const { connectMongo } = require("../models/connect");
const ModelManager = require("../models/manager");
const jwt = require("../utils/jwt");

class FakeUserFactory {
    async setUp() {
        const { client, db } = await connectMongo();
        const manager = new ModelManager(db);
        this.client = client;
        this.user_model = manager.UserModel;
    }

    async create(user) {
        await this.user_model.collection.insertOne(user);
        const token = await jwt.sign({ user_id: user._id });
        return token;
    }

    async tearDown() {
        await this.user_model.collection.deleteMany({});
        await this.client.close();
    }
}

module.exports = { FakeUserFactory };
