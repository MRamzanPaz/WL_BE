import { HttpStatus, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { ResponseService } from '../service/response.service';
import { JwtService } from '../service/jwt.service';
import { GeneralService } from '../service/general.service';
import { Response } from 'express';
import { Request } from 'express';

@Injectable()
export class CustomerMiddleware implements NestMiddleware {

  constructor(
    @Inject('RESPONSE-SERVICE') private res: ResponseService,
    @Inject('JWT-SERVICE') private jwt: JwtService,
    @Inject('GENERAL-SERVICE') private _general: GeneralService
  ){}

  async use(req: Request, res: Response, next: () => void) {
    try {
      

      if(req.headers){        

        // console.log(req.headers.authorization)
        const { authorization } = req.headers;

        if (!authorization) {
          return res.send(this.res.generateResponse(HttpStatus.NOT_ACCEPTABLE,'Session timed out please login again!',null,req));
        }

        const decodedToken = this.jwt.decodeCustomer(authorization);

        const isVerify = await this._general.verifyCustomer(decodedToken,authorization);

        if(!isVerify){
          return res.send(this.res.generateResponse(HttpStatus.NOT_ACCEPTABLE,'Session timed out please login again!',null,req));
        }

        next()

      }else{
        return res.send(this.res.generateResponse(HttpStatus.BAD_GATEWAY,'Headers is missing',[],req));
      }


    } catch (error) {
      // console.log(error);
      return res.send( await this.res.generateError(error, req, false));
    }
  }
}
