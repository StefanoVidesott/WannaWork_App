const validateOffer = (req, res, next) => {
    const { position, description, workHours, salary, workLocation, contactMethod } = req.body;
    const errors = [];

    if (!position || position.length < 10) errors.push('Titolo posizione troppo corto (min 10)');
    if (!description || description.length < 50) errors.push('Descrizione troppo corta (min 50)');
    if (!workHours) errors.push('Disponibilità oraria richiesta');
    if (!salary) errors.push('Retribuzione indicativa richiesta');
    if (!workLocation) errors.push('Luogo di lavoro richiesto');

    // Validazione email se presente nel metodo di contatto
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (contactMethod && contactMethod.includes('@') && !emailRegex.test(contactMethod)) {
        errors.push('Formato email di contatto non valido');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }
    next();
};

export default validateOffer;