import mongoose from 'mongoose';

const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};

// Funzione per validare password (min 12 caratteri)
const isValidPassword = (password) => {
    return password && password.length >= 12;
};

const validateStudentRegistration = (req, res, next) => {
    const { name, surname, email, education, educationYear, password, confermaPassword, consensoPrivacy } = req.body;

    const errors = [];

    // Campi obbligatori
    if (!name || name.trim().length === 0) {
        errors.push('Nome è obbligatorio');
    }

    if (!surname || surname.trim().length === 0) {
        errors.push('Cognome è obbligatorio');
    }

    if (!email || !isValidEmail(email)) {
        errors.push('Email non valida');
    }

    // Verifica se è presente e se è un ObjectId valido di MongoDB
    if (!education || !mongoose.Types.ObjectId.isValid(education)) {
        errors.push('Istituto di istruzione non valido o mancante');
    }

    // Verifica se è presente e se è un numero
    if (!educationYear || isNaN(Number(educationYear))) {
        errors.push('Anno di corso non valido');
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

export default validateStudentRegistration;