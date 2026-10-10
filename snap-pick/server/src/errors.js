export class HttpError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;   // field-level errors, shown inline by the frontend form
    }
}

// forwards async errors to the error handler (safe on Express 4 and 5)
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);