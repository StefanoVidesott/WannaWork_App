import mongoose from 'mongoose';

const validateOffer = (req, res, next) => {
    const {
        position, description, workHours,
        workLocation, contactMethod, contractType, desiredSkills
    } = req.body;

    const errors = [];

    if (!position || typeof position !== 'string') {
        errors.push('Il titolo della posizione è obbligatorio');
    } else {
        if (position.trim().length < 10) errors.push('Titolo posizione troppo corto (min 10 caratteri)');
        if (position.trim().length > 100) errors.push('Titolo posizione troppo lungo (max 100 caratteri)');
    }

    if (!description || typeof description !== 'string') {
        errors.push('La descrizione è obbligatoria');
    } else {
        if (description.trim().length < 50) errors.push('Descrizione troppo corta (min 50 caratteri)');
        if (description.trim().length > 2000) errors.push('Descrizione troppo lunga (max 2000 caratteri)');
    }

    if (!workHours) errors.push('Disponibilità oraria richiesta');
    if (!workLocation) errors.push('Luogo di lavoro richiesto');
    if (!contactMethod) errors.push('Modalità di contatto richiesta');

    const validContractTypes = ['determinato', 'indeterminato', 'stage', 'altro'];
    if (contractType && !validContractTypes.includes(contractType)) {
        errors.push('Tipo di contratto non valido');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (contactMethod && contactMethod.includes('@') && !emailRegex.test(contactMethod)) {
        errors.push('Formato email di contatto non valido');
    }

    if (desiredSkills && Array.isArray(desiredSkills)) {
        const invalidIds = desiredSkills.some(id => !mongoose.Types.ObjectId.isValid(id));
        if (invalidIds) errors.push('ID competenze non validi');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Dati offerta non validi', errors });
    }

    next();
};

export default validateOffer;
