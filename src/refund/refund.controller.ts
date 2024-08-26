import { Body, Controller, Get, Inject, Post, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { InitiateDto } from './refund.dto';
import { RefundService } from './refund.service';

@Controller('refund')
export class RefundController {

    constructor(
        @Inject('REFUND-SERVICE') private _refund: RefundService
    ){}

    @Post('initiate')
    initiateRefundToCustomer(@Body() body: InitiateDto, @Request() req: request){
        return this._refund.initiateRefundToCustomer(body, req)
    }

    @Get('list')
    getRefundList(@Request() req: request){
        return this._refund.getRefundList(req)
    }

}
