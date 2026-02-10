import jwt from 'jsonwebtoken';

const tokenChecker = (req, res, next) => {
    // 1. Cerca il token
    let token = req.body.token || req.query.token || req.headers['x-access-token'];

    // 2. Gestione Header Authorization
    if (!token && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader;
        }
    }

    // 3. Se non c'è token
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token mancante.' });
    }

    // 4. Verifica e Assegnazione
    const secret = process.env.JWT_SECRET || process.env.SUPER_SECRET;
    
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token scaduto o non valido.' });
        } else {
            // --- CORREZIONE QUI ---
            // Prima stavi probabilmente assegnando req.headers o altro.
            // Ora assegniamo ESPLICITAMENTE il payload decodificato.
            req.user = decoded; 
            
            // Log di verifica: Deve stampare l'ID (es. 6946...)
            console.log("🔓 TOKEN APERTO. ID Trovato:", req.user.id);
            
            next();
        }
    });
};

export default tokenChecker;