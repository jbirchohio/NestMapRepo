export class UnauthorizedError extends Error {
  statusCode: number;
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    
    // Set the prototype explicitly to ensure proper inheritance
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

