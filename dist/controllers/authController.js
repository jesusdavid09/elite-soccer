"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCookie = exports.logout = exports.register = exports.login = exports.showRegister = exports.render = exports.res = exports.showLogin = void 0;
const database_1 = __importDefault(require("../config/database"));
const bcrypt_1 = require("../utils/bcrypt");
const jwt_1 = require("../utils/jwt");
const showLogin = (req, res) => ;
exports.showLogin = showLogin;
('auth/login', { title: 'Iniciar Sesión', error: null, success: null });
;
const showRegister = (req, res) => ;
exports.showRegister = showRegister;
('auth/register', { title: 'Registro', error: null });
;
const login = async (req, res) => ;
exports.login = login;
const { email, password } = req.body;
try {
    const result = await database_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
        return exports.res.render('auth/login', { title: 'Iniciar Sesión', error: 'Credenciales incorrectas', success: null });
    }
    const user = result.rows[0];
    const isValid = await (0, bcrypt_1.comparePassword)(password, user.password_hash);
    if (!isValid) {
        return exports.res.render('auth/login', { title: 'Iniciar Sesión', error: 'Credenciales incorrectas', success: null });
    }
    if (!user.approved) {
        return exports.res.render('auth/login', { title: 'Iniciar Sesión', error: 'Cuenta pendiente de aprobación', success: null });
    }
    const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email, role: user.role, full_name: user.full_name });
    exports.res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    if (user.role === 'coach') {
        exports.res.redirect('/coach/dashboard');
    }
    else {
        exports.res.redirect('/player/dashboard');
    }
}
catch (error) {
    exports.res.render('auth/login', { title: 'Iniciar Sesión', error: 'Error en el servidor', success: null });
}
;
const register = async (req, res) => ;
exports.register = register;
const { email, password, full_name, role, coach_key, jersey_number, position, age, phone } = req.body;
try {
    return exports.res.render('auth/register', { title: 'Registro', error: 'Clave de entrenador incorrecta' });
}
finally {
}
const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
const userResult = await database_1.default.query(`INSERT INTO users (email, password_hash, full_name, role, approved) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`, [email, hashedPassword, full_name, role, role === 'coach']);
const userId = userResult.rows[0].id;
const playerResult = await database_1.default.query(`INSERT INTO players (user_id, jersey_number, position, age, phone) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`);
if (playerResult.rows[0]) {
    await database_1.default.query(`INSERT INTO statistics (player_id, season) VALUES ($1, '2024')`, [playerResult.rows[0].id]);
}
if (role === 'coach') {
    exports.res.render('auth/login', { title: 'Iniciar Sesión', error: null, success: '✅ Cuenta de entrenador creada' });
}
else {
    exports.res.render('auth/login', { title: 'Iniciar Sesión', error: null, success: '✅ Registro exitoso. Espera aprobación.' });
}
try { }
catch (error) {
    if (error.code === '23505') {
        exports.res.render('auth/register', { title: 'Registro', error: 'El email ya está registrado' });
    }
    else {
        exports.res.render('auth/register', { title: 'Registro', error: 'Error en el servidor' });
    }
}
;
const logout = (req, res) => ;
exports.logout = logout;
('token');
exports.res.redirect('/login');
;
