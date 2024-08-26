import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { AddFaqDto, PaginationDto, UpdateDto } from './faq.dto';
import { FaqService } from './faq.service';

@Controller('faq')
export class FaqController {
    
    constructor(
        @Inject('FAQ-SERVICE') private _faq: FaqService
    ){}

    @Post('add')
    addQuestion( @Body() body: AddFaqDto, @Request() req: request ){
        return this._faq.addQuestion(body, req);
    }

    @Put('update')
    updateQuestion(@Body() body: UpdateDto, @Request() req: request){
        return this._faq.updateQuestion(body, req);
    }

    @Delete('delete/:id')
    deleteQuestion( @Param('id') id: string, @Request() req: request){

        return this._faq.deleteQuestion(id, req)

    }

    @Get('all')
    getAllFaq(@Request() req: request){
        return this._faq.getAllFaq(req)
    }

    @Get('all/pagination')
    getAllFaqBypagination( @Query() query: PaginationDto,  @Request() req: request){
        return this._faq.getAllFaqBypagination(query, req);
    }

    @Get(':id')
    getFaqById(@Param('id') id: string, @Request() req: request){
        return this._faq.getFaqById(id, req)
    }


}
