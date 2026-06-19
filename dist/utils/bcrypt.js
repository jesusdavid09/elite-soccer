"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SALT_ROUNDS = 10;
return await bcrypt_1.default.hash(password, SALT_ROUNDS);
;
return await bcrypt_1.default.compare(password, hash);
;
