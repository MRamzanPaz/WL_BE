import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
@Injectable()
export class JwtService {

    createCustomerAuth(payload:any){
        const authToken = jwt.sign(payload, process.env.JWT_CUSTOMER_SECRETE, {expiresIn: '2h'})
        return authToken;
    }

    decodeCustomer(token: string){
        const decode = jwt.verify(token, process.env.JWT_CUSTOMER_SECRETE);
        return decode;
    }

}
