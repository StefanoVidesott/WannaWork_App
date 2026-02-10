// middleware/ValidationAvailabilityProfile.js

const isValidItalianPhone = (phone) => {
    if (!phone) return false;
    const phoneStr = String(phone);
    return /^(\+39|0039)?3[0-9]{9}$/.test(phoneStr.replace(/[\s-]/g, ''));
};

const isValidPeriodoDsponibilita = (dataInizio, dataFine) => {
    const inizio = new Date(dataInizio);
    const fine = new Date(dataFine);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0); 
    inizio.setHours(0, 0, 0, 0); 

    if (isNaN(inizio.getTime()) || isNaN(fine.getTime())) return { valid: false, message: 'Date non valide' };
    
    if (inizio < oggi) return { valid: false, message: 'La data di inizio non può essere nel passato' };
    if (fine <= inizio) return { valid: false, message: 'La data di fine deve essere successiva alla data di inizio' };
    
    return { valid: true };
};

const validateAvailabilityProfile = (req, res, next) => {
    
    // Capiamo se stiamo creando (POST) o aggiornando (PUT/PATCH)
    const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

    let { telefono, esperienza, Availability } = req.body;

    const errors = [];
      
    // --- VALIDAZIONE TELEFONO ---
    // Se è CREATE: Obbligatorio.
    // Se è UPDATE: Controlla solo se l'utente ha inviato un nuovo telefono.
    if ((!isUpdate && !telefono) || (telefono && !isValidItalianPhone(telefono))) {
        errors.push('Numero di telefono mancante o non valido');
    }
    
    // --- VALIDAZIONE DISPONIBILITÀ ---
    if (Availability) {
        if (!Availability.dataInizio || !Availability.dataFine) {
            errors.push('Se modifichi la disponibilità, devi inserire sia dataInizio che dataFine');
        } else {
            const periodoValidation = isValidPeriodoDsponibilita(
                Availability.dataInizio,
                Availability.dataFine
            );
            if (!periodoValidation.valid) errors.push(periodoValidation.message);
        }
    } else if (!isUpdate) {
        // Se stiamo creando, Availability è obbligatoria
        errors.push('Il periodo di disponibilità è obbligatorio');
    }
    
    // --- VALIDAZIONE ESPERIENZA ---
    if (esperienza && esperienza.length > 1000) {
        errors.push('Il campo esperienza può contenere al massimo 1000 caratteri');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errore validazione dati',
            errors: errors
        });
    }
    
    next();
};

export default validateAvailabilityProfile;