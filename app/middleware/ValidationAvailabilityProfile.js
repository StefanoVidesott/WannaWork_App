const isValidItalianPhone = (phone) => /^(\+39|0039)?3[0-9]{9}$/.test(String(phone).replace(/[\s-]/g, ''));

const validateAvailabilityProfile = (req, res, next) => {
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';
    // Assicurati che i nomi corrispondano al frontend (usiamo 'availability' minuscolo)
    const { phone, experience, availability } = req.body;
    const errors = [];

    // Validazione Telefono
    if (!isUpdate || phone) {
        if (!phone || !isValidItalianPhone(phone)) {
            errors.push('Numero di telefono non valido (formato italiano richiesto)');
        }
    }

    // Validazione Disponibilità
    if (availability) {
        console.log(availability)
        const inizio = new Date(availability.dataInizio);
        const fine = new Date(availability.dataFine);
        if (isNaN(inizio) || isNaN(fine)) {
            errors.push('Date non valide');
        } else if (fine <= inizio) {
            errors.push('La data di fine deve essere successiva a quella di inizio');
        }
    } else if (!isUpdate) {
        errors.push('Il periodo di disponibilità è obbligatorio');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }
    next();
};

export default validateAvailabilityProfile;