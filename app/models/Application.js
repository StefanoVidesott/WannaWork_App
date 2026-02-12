import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Offer'
    },
    // Denormalizziamo l'employer per facilitare le query lato azienda
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employee'
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn'],
        default: 'pending'
    },
    // Messaggio di presentazione opzionale
    message: {
        type: String,
        maxlength: 500,
        trim: true
    },
    // Per tracciare la timeline (es. inviata -> visualizzata -> valutata)
    history: [{
        status: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { 
    timestamps: true // Gestisce automaticamente createdAt (data invio) e updatedAt
});

// Indice composto univoco: uno studente non può candidarsi due volte alla stessa offerta
applicationSchema.index({ student: 1, offer: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);