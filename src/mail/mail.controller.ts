import { Body, Controller, Post, Request, Get } from '@nestjs/common';
import { SetupEmailDto } from './email.dto';
import { Request as request } from 'express';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {

    constructor(
        private _mail: MailService
    ){}

    @Post('setup')
    setupEmailAttribute(@Body() body: SetupEmailDto, @Request() req: request){
        return this._mail.setupEmailAttribute(body, req);
    }

    @Get()
    getEmailSetup(@Request() req: request){
        return this._mail.getEmailSetup(req)
    }

}
