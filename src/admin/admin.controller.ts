import { Body, Controller, Get, Inject, Param, Post, Query, Request } from '@nestjs/common';
import { EsimDetailsQuery, PurchasePlanDto } from './admin.dto';
import { query, Request as request } from 'express';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(
        @Inject('ADMIN-SERVICE') private _admin: AdminService
    ){}

    @Post('purchase-plan')
    purchaseEsimByAdmin(@Body() body: PurchasePlanDto, @Request() req: request){
        return this._admin.purchaseEsimByAdmin(body, req)
    }

    @Get('esim-details')
    getEsimDetails(@Query() query: EsimDetailsQuery, @Request() req: request){
        return this._admin.getEsimDetails(query, req);
    }
}
