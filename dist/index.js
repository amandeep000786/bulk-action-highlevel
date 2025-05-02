"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const rabbitmq_1 = require("./config/rabbitmq");
const bulkActions_route_1 = __importDefault(require("./routes/bulkActions.route"));
const contactUpdateConsumer_1 = require("./consumers/contactUpdateConsumer");
const config_1 = __importDefault(require("./config/config"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(uploadRoutes_1.default);
app.use('/api', bulkActions_route_1.default);
const start = async () => {
    await (0, db_1.connectDB)();
    await (0, rabbitmq_1.connectRabbitMQ)();
    await (0, contactUpdateConsumer_1.consumeContactUpdates)();
    const port = config_1.default.port || 3000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
};
start();
