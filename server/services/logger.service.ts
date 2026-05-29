import { SystemLog } from '../../src/types';

class LoggerService {
  private logs: SystemLog[] = [
    {
      id: '1',
      timestamp: new Date().toLocaleString('pt-BR'),
      type: 'info',
      message: 'Servidor Backend Express Inicializado com Sucesso.',
      details: 'Pronto para receber credenciais e chamadas do Bling ERP v3.'
    }
  ];

  public getLogs(): SystemLog[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs.length = 0;
    this.log('info', 'Histórico de logs limpo pelo usuário.');
  }

  public log(
    type: 'error' | 'info' | 'success',
    message: string,
    details?: any
  ): void {
    const timestampStr = new Date().toLocaleString('pt-BR');
    const prefix = `[${type.toUpperCase()}] [${timestampStr}]`;
    
    // Console output for structured logs
    if (type === 'error') {
      console.error(`${prefix} ${message}`, details || '');
    } else {
      console.log(`${prefix} ${message}`, details || '');
    }

    const newLog: SystemLog = {
      id: String(Date.now() + Math.random()),
      timestamp: timestampStr,
      type,
      message,
      details: details
        ? typeof details === 'object'
          ? JSON.stringify(details, null, 2)
          : String(details)
        : undefined
    };

    this.logs.unshift(newLog);
    if (this.logs.length > 100) {
      this.logs.pop();
    }
  }
}

export const logger = new LoggerService();
