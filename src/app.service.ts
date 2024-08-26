import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): any {
    return {
      code: 1,
      msg: 'Api is working fine and !!! health 100%',
    };
  }
}
