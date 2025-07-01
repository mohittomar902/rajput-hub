class ResponseHandler {
  static success(res, data = null, message = 'Success', code = 200) {
    return res.status(code).json({
      code,
      isSuccess: true,
      message,
      data
    });
  }

  static error(res, message = 'Error occurred', code = 500, data = null) {
    return res.status(code).json({
      code,
      isSuccess: false,
      message,
      data
    });
  }

  static notFound(res, message = 'Resource not found', data = null) {
    return this.error(res, message, 404, data);
  }

  static pageNotFound(res, message = 'Page not found', data = null) {
    return this.success(res, message, 1004, data);
  }

  static badRequest(res, message = 'Bad request', data = null) {
    return this.error(res, message, 400, data);
  }

  static unauthorized(res, message = 'Unauthorized', data = null) {
    return this.error(res, message, 401, data);
  }

  static forbidden(res, message = 'Forbidden', data = null) {
    return this.error(res, message, 403, data);
  }

  static validationError(res, message = 'Validation failed', data = null) {
    return this.error(res, message, 422, data);
  }

  static conflict(res, message = 'Conflict', data = null) {
    return this.error(res, message, 409, data);
  }

  // Custom response with specific structure
  static custom(res, code, isSuccess, message, data = null) {
    return res.status(code).json({
      code,
      isSuccess,
      message,
      data
    });
  }
}

module.exports = ResponseHandler; 