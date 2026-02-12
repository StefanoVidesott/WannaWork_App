import mongoose from 'mongoose';

const validateApplication = (req, res, next) => {
    const { offerId, message } = req.body;
    const errors = [];

    // 1. Validazione ID Offerta
    if (!offerId) {
        errors.push('L\'ID dell\'offerta è obbligatorio');
    } else if (!mongoose.Types.ObjectId.isValid(offerId)) {
        errors.push('ID offerta non valido');
    }

    // 2. Validazione Messaggio (opzionale ma con limiti)
    if (message && message.length > 500) {
        errors.push('Il messaggio non può superare i 500 caratteri');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

export default validateApplication;