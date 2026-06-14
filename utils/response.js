/**
 * Standardized response helpers
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

const sendPaginated = (res, data, total, page, limit) => {
  return res.status(200).json({
    success:     true,
    data,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = { sendSuccess, sendCreated, sendError, sendPaginated };
