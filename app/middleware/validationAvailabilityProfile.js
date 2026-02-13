const isValidItalianPhone = (phone) => {
    return /^(\+39|0039)?3[0-9]{9}$/.test(String(phone).replace(/[\s-]/g, ''));
};

const validateAvailabilityProfile = (req, res, next) => {
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    const { phone, availability, workHours, skills } = req.body;
    const errors = [];

    if (phone && !isValidItalianPhone(phone)) {
        errors.push('Numero di telefono non valido (richiesto formato cellulare italiano)');
    }

    if (!isUpdate && (!availability || typeof availability !== 'object')) {
        errors.push('Il periodo di disponibilità è obbligatorio per creare un profilo');
    }

    if (availability && typeof availability === 'object') {
        const inizio = new Date(availability.dataInizio);
        const fine = new Date(availability.dataFine);

        if (isNaN(inizio.getTime()) || isNaN(fine.getTime())) {
            errors.push('Date non valide o mancanti');
        } else {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            if (inizio < now) {
                errors.push('La data di inizio non può essere nel passato');
            }
            if (fine <= inizio) {
                errors.push('La data di fine deve essere successiva alla data di inizio');
            }
        }
    }

    if (workHours !== undefined && (isNaN(Number(workHours)) || Number(workHours) < 0)) {
        errors.push('Le ore lavorative devono essere un numero positivo');
    }

    if (skills && !Array.isArray(skills)) {
        errors.push('Il formato delle skills non è valido (richiesto array)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Dati non validi',
            errors: errors
        });
    }

    next();
};

export default validateAvailabilityProfile;
