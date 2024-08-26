import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { GenerateDto, PaginationDto, calcDiscount } from './coupon.dto';
import { CouponService } from './coupon.service';

@Controller('coupon')
export class CouponController {
    constructor(
        @Inject("COUPON-SERVICE") private _coupon: CouponService,
    ){}

    @Post('generate')
    generateCoupon( @Body() body: GenerateDto, @Request() req: request ){
        return this._coupon.createCoupon(body, req)
    }

    @Get('calculate')
    getCalculatedAmount( @Query() queryParams: calcDiscount, @Request() req: request ){
        return this._coupon.calculateAmount(queryParams, req)
    }

    @Delete('delete/:id')
    deleteCoupon(@Param('id') id: string,  @Request() req: request){
        return this._coupon.deleteCoupon(id, req)
    }

    @Get('all')
    getAllCoupon( @Request() req: request ){
        return this._coupon.getAllCoupons(req);
    }

    @Get('all/pagination')
    getAllCouponsWithPagination(@Query() params: PaginationDto, @Request() req: request ){
        return this._coupon.getAllCouponsWithPagination(params, req)
    }
}
