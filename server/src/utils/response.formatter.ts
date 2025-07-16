import { Response } from 'express';

export class ResponseFormatter {
  /**
   * Send a success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send an error response
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: any
  ): Response {
    const response: any = {
      success: false,
      message,
      statusCode
    };

    // In development, include the error stack trace
    if (process.env.NODE_ENV === 'development' && error) {
      response.error = error.message || error;
      response.stack = error.stack;
    }

    return res.status(statusCode).json(response);
  }
}

export default ResponseFormatter;
