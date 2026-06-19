"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SECRET = process.env.JWT_SECRET;
const generateToken = (payload) => ;
exports.generateToken = generateToken;
return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: '7d' });
;
const verifyToken = (token) => ;
exports.verifyToken = verifyToken;
try {
    return jsonwebtoken_1.default.verify(token, SECRET);
}
catch {
    return null;
}
;
