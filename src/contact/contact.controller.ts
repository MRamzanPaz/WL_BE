import { Body, Controller, Get, Inject, Param, Post, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { ContactService } from './contact.service';
import { AffiliateDto, ContactUsDto, PaginationDto, ResellerDto } from './contact.dto';

@Controller('contact')
export class ContactController {
    constructor(
        @Inject('CONTACT-SERVICE') private _contact: ContactService
    ) { }

    @Post('create')
    generateContact(@Body() body: ContactUsDto, @Request() req: request) {
        return this._contact.createContact(body, req);
    }

    @Get('all')
    getAllContact(@Request() req: request) {
        return this._contact.getAllContact(req);
    }

    @Get('all/pagination')
    getAllContactWithPagination(@Query() params: PaginationDto, @Request() req: request) {
        return this._contact.getAllContactWithPagination(params, req);
    }

    @Post('affiliate')
    generateAffiliate(@Body() body: AffiliateDto, @Request() req: request) {
        return this._contact.createAffiliate(body, req);
    }

    @Get('affiliate/all')
    getAllAffiliate(@Request() req: request) {
        return this._contact.getAllAffiliate(req);
    }


    @Post('reseller')
    generateReseller(@Body() body: ResellerDto, @Request() req: request) {
        return this._contact.createReseller(body, req);
    }

    @Get('reseller/all')
    getAllReseller(@Request() req: request) {
        return this._contact.getAllReseller(req);
    }

    @Get(':id')
    getContactById(@Param('id') id: string, @Request() req: request) {
        return this._contact.getContactById(id, req);
    }


}
