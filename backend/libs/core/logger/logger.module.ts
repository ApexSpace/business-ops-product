import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { buildPinoHttpConfig } from './pino-http.config';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: buildPinoHttpConfig(),
    }),
  ],
})
export class LoggerModule {}
