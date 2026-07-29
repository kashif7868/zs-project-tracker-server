export const notFoundMiddleware = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const globalErrorMiddleware = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  const response = {
    success: false,
    message: error.message || "Internal server error",
  };

  if (
    process.env.NODE_ENV === "development" &&
    statusCode === 500
  ) {
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};