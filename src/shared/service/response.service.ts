import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Logs } from 'src/entities/log.entity';
import { Repository } from 'typeorm';
import { ApiService } from './api.service';
import { Request } from 'express';

@Injectable()
export class ResponseService {
    constructor(
        @InjectRepository(Logs)
        private readonly _logsRepo: Repository<Logs>,
        @Inject('API-SERVICE') private _api: ApiService
    ){}

    generateResponse(code: any , msg: string , data:any, req: Request){

        const {originalUrl} = req;
        const payload = {
            message: msg,
            isError: false,
            route: originalUrl,
            status_code: code
        }
        const createLog = this._logsRepo.create(payload);
        this._logsRepo.save(createLog);
        
        if(code != 200){
            throw new HttpException(msg, code);
        }

        return {
            code: code,
            message: msg,
            data: data
        }
    }

    async generateError(error: any ,req?: Request, isSlacked:boolean = true){

        console.log(req.originalUrl);
        const {originalUrl} = req;
        const payload = {
            message: error?.message,
            isError: true,
            route: originalUrl,
            status_code: HttpStatus.INTERNAL_SERVER_ERROR
        }
        const createLog = this._logsRepo.create(payload);
        await this._logsRepo.save(createLog);

        // if(isSlacked){ 
            // await this._api.postSlackMessage(error, originalUrl)
        // }
        
        let msg = error.message;
        let code = HttpStatus.INTERNAL_SERVER_ERROR
        if(error.message == 'jwt expired' || error.message == 'jwt malformed'){
            msg = 'Session timed out please login again!'
            code = HttpStatus.UNAUTHORIZED
        }

        // console.log(error)

        throw new HttpException(msg , HttpStatus.INTERNAL_SERVER_ERROR)
        // return {
        //     code: code,
        //     message: msg,
        //     data: null
        // }
    }
}

