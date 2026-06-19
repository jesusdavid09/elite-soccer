"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCoach = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const authenticate = (req, res, next) => ;
exports.authenticate = authenticate;
if (!token)
    return res.redirect('/login');
const decoded = (0, jwt_1.verifyToken)(token);
if (!decoded) {
    res.clearCookie('token');
    return res.redirect('/login');
}
req.user = decoded;
next();
;
const isCoach = (req, res, next) => ;
exports.isCoach = isCoach;
if (req.user?.role !== 'coach') {
    return res.status(403).render('error', {
        title: 'Acceso Denegado',
        message: 'No tienes permisos de entrenador',
        user: req.user
    });
}
next();
;
