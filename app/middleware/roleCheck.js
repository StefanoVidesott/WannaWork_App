export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // req.user viene popolato dal tokenChecker precedente
        if (!req.user || !allowedRoles.includes(req.user.userType)) {
            return res.status(403).json({
                success: false,
                message: 'Accesso negato: non hai i permessi necessari.'
            });
        }
        next();
    };
};