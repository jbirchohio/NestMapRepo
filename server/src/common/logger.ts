export class Logger {
  constructor(private context: string) {}

  log(message: string, ...optionalParams: any[]) {
    console.log(`[${new Date().toISOString()}] [${this.context}] ${message}`, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG: ${message}`, ...optionalParams);
    }
  }
}

