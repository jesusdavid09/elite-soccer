"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir = path_1.default.join(__dirname, '../../public/uploads/players');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) = , uploadDir
}), filename = ;
const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
cb(null, `player-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
;
const fileFilter = (req, file, cb) => ;
