export const validateSchema = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // Map Zod errors to a clear readable string
    const errorMessage = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    
    res.status(400);
    const validationError = new Error(errorMessage);
    validationError.code = 'VALIDATION_ERROR';
    return next(validationError);
  }
  
  // Replace request body with parsed and validated result to ensure sanitization
  req.body = result.data;
  next();
};
