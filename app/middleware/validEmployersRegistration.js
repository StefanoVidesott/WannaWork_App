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

const validateEmployerRegistration = (req, res, next) => {
    const { companyName, email, headquarters, website, password, confirmPassword, privacy } = req.body;

    const errors = [];

    if (!companyName || companyName.trim().length === 0) {
        errors.push('Nome azienda è obbligatorio');
    }

    if (!email || !isValidEmail(email)) {
        errors.push('Email aziendale non valida');
    }

    if (website && website.trim().length > 0 && !isValidUrl(website)) {
        errors.push('Sito web non valido. Deve iniziare con http:// o https://');
    }

    if (!headquarters || headquarters.trim().length < 10) {
        errors.push('La sede principale è obbligatoria e deve contenere almeno 10 caratteri');
    }

    if (!password || !isValidPassword(password)) {
        errors.push('La password deve contenere almeno 12 caratteri');
    }

    if (password !== confirmPassword) {
        errors.push('Le password non coincidono');
    }

    if (privacy !== true) {
        errors.push('Devi accettare la privacy policy per poterti registrare');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            errors: errors
        });
    }

    next();
};

export default validateEmployerRegistration;
