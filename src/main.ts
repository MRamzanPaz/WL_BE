import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { ExtendedSocketIoAdapterHttp, ExtendedSocketIoAdapterHttps } from './SocketConnectionAdapter';
import * as bodyParser from 'body-parser';

//enable at time of production
const httpsOptions: HttpsOptions = {
  // key: fs.readFileSync(join(process.cwd(), 'privkey.pem')),
  // cert: fs.readFileSync(join(process.cwd(), 'fullchain.pem')),
  rejectUnauthorized: false,
  // requestCert: true
}

const server = express();

async function bootstrap() {

  const httpsSocket = https.createServer(httpsOptions);
  const httpSocket = http.createServer()

  const app = await NestFactory.create<NestExpressApplication>(AppModule,
    new ExpressAdapter(server),
    { cors: true }
  );

  app.useBodyParser('json', { limit: '10mb' });
  app.use(bodyParser.text({
    type: 'application/xml'
  }))
  app.useGlobalPipes(new ValidationPipe())
  app.setBaseViewsDir(resolve(__dirname, 'view'));
  app.setViewEngine('hbs');
  app.enableCors({ origin: '*' })
  app.setGlobalPrefix('api/v1')

  app.useWebSocketAdapter(new ExtendedSocketIoAdapterHttp(httpSocket));
  app.useWebSocketAdapter(new ExtendedSocketIoAdapterHttps(httpsSocket));

  await app.init();

  http.createServer(server).listen(parseInt(process.env.PORT) || 3005, '0.0.0.0', function () {
    console.log(`listening on port 3005 without ssl`);
  });
  https.createServer(httpsOptions, server).listen(3006, '0.0.0.0', function () {
    console.log(`listening on port 3006 with ssl`);
  });

  httpsSocket.listen(9090, () => {
    console.log(`Https Socket Connected with SSL through PORT: ${9090}`)
  });
  httpSocket.listen(9091, () => {
    console.log(`Http Socket Connected without SSL through PORT: ${9091}`)
  })
}
bootstrap();
