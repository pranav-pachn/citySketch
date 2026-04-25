export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.name}: ${err.message}`)
  
  if (err.stack) {
    console.error(err.stack)
  }

  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal Server Error'

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}

// Utility to wrap async controllers so we don't need try/catch blocks everywhere
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
