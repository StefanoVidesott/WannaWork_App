import jwt from 'jsonwebtoken';

const tokenChecker = (req, res, next) => {
    let token = req.body?.token || req.query?.token || req.headers['x-access-token'];

    if (!token && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token mancante.' });
    }

    const secret = process.env.JWT_SECRET;

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token non valido.' });
        }

        req.user = decoded;
        next();
    });
};

export default tokenChecker;
