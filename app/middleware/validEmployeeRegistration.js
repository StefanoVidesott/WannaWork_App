import { URL } from 'url';

const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};

// Funzione per validare URL sito web
const isValidUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (err) {
        return false;
    }
};

// Funzione per validare password (min 12 caratteri)
const isValidPassword = (password) => {
    return password && password.length >= 12;
};

const validateEmployeeRegistration = (req, res, next) => {
    const { companyName, email, headquarters, website, password, confermaPassword, consensoPrivacy } = req.body;

    const errors = [];

    // Campi obbligatori
    if (!companyName || companyName.trim().length === 0) {
        errors.push('Nome azienda è obbligatorio');
    }

    if (!email || !isValidEmail(email)) {
        errors.push('Email aziendale non valida');
    }

    // Sito web opzionale ma se presente deve essere valido
    if (website && website.trim().length > 0 && !isValidUrl(website)) {
        errors.push('Sito web non valido. Deve iniziare con http:// o https://');
    }

    // Validazione password
    if (!password || !isValidPassword(password)) {
        errors.push('La password deve contenere almeno 12 caratteri');
    }

    /*
        if (password !== confermaPassword) {
            errors.push('Le password non coincidono');
        }

        if (!consensoPrivacy) {
            errors.push('Devi accettare la privacy policy');
        }
    */


    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors: errors
        });
    }

    next();
};

export default validateEmployeeRegistration;