import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupons } from 'src/entities/coupon.entity';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Like, Repository } from 'typeorm';
import { GenerateDto, PaginationDto, calcDiscount } from './coupon.dto';
import { Request } from 'express';
import * as generator from 'otp-generator';
import * as moment from 'moment';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';

@Injectable()
export class CouponService {

    constructor(
        @InjectRepository(Coupons)
        private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(CouponsDetails)
        private readonly _couponDetRepo: Repository<CouponsDetails>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
    ){}

    async createCoupon( body: GenerateDto, req:Request ){

        try {
            
            const { systemGenerated, couponCode } = body;

            if(!systemGenerated){

                const findCoupon = await this._couponRepo.createQueryBuilder('Coupons')
                .where("couponCode = :couponCode AND deleted_at IS NULL AND ( expiry_date IS NULL OR expiry_date > :today)", {couponCode: couponCode, today: new Date()})
                .getOne()

                if(findCoupon){
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Coupon is already created by this code!", null, req);
                }

                const payload = {
                    ...body,
                    remainingUse: body.noOfUse,
                    start_date: moment(body.start_date, 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss'),
                    expiry_date: body.expiry_date ? moment(body.expiry_date, 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss') : null
                }

                const createCoupon = this._couponRepo.create(payload);
                await this._couponRepo.save(createCoupon);

                
                return this.res.generateResponse(HttpStatus.OK, "Coupon is created successfully!", null, req);

            }else{
                const code = await this.generateCouponCode();
                
                const payload = {
                    ...body,
                    couponCode: code,
                    remainingUse: body.noOfUse,
                    start_date: moment(body.start_date, 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss'),
                    expiry_date: body.expiry_date ? moment(body.expiry_date, 'YYYY-MM-DD').format('YYYY-MM-DD HH:mm:ss') : null
                }

                const createCoupon = this._couponRepo.create(payload);
                await this._couponRepo.save(createCoupon);

                
                return this.res.generateResponse(HttpStatus.OK, "Coupon is created successfully!", null, req);

            }

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async generateCouponCode(){

        const code =  generator.generate(6, {
            digits: true,
            lowerCaseAlphabets: true,
            upperCaseAlphabets: true,
            specialChars: false
        })

        const findCoupon = await this._couponRepo.createQueryBuilder('Coupons')
        .where("couponCode = :couponCode AND ( deleted_at IS NULL OR expiry_date IS NULL OR expiry_date > :today)", {couponCode: code, today: new Date()})
        .getOne()

        if(findCoupon){
            return this.generateCouponCode()
        }

        return code
    }


    async deleteCoupon(id: string, req:Request){

        try {
            
            const deleteOne = await this._couponRepo.createQueryBuilder('Coupons')
            .update()
            .set({
                deleted_at: new Date()
            })
            .where("id = :id AND deleted_at IS NULL", {id: parseInt(id)})
            .execute()

            if(!deleteOne.affected){
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Coupon is already deleted!", null, req);
            }

            return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Coupon is deleted successfully !", null, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllCoupons(req: Request){
        try {
            
            const findAll = await this._couponRepo.find({
                where: {
                    deleted_at: IsNull()
                },
                
            })

            return this.res.generateResponse(HttpStatus.OK, "Coupons List", findAll, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllCouponsWithPagination(params: PaginationDto, req:Request){
        try {
            
            const { searchStr, page, pageSize } = params;

            const findAll = await this._couponRepo.find({
                where: [
                    { name: Like(`%${searchStr}%`) , deleted_at: IsNull()},
                    { couponCode: Like(`%${searchStr}%`), deleted_at: IsNull() }
                ],
                relations: {
                    details: {
                        order: true
                    },
                    
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            })

            const totalcount = await this._couponRepo.count({
                where: [
                    { name: Like(`%${searchStr}%`) , deleted_at: IsNull()},
                    { couponCode: Like(`%${searchStr}%`), deleted_at: IsNull() }
                ],
            })

            const data = {
                list: findAll,
                total_count: totalcount,
                page,
                pageSize
            }

            return this.res.generateResponse(HttpStatus.OK, "Coupons List", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async calculateAmount(queryParams: calcDiscount, req: Request){

        try {
            
            const { amount, couponCode } = queryParams;
            if(!couponCode){
                return this.res.generateResponse(HttpStatus.OK, "Amount", {amount: amount}, req)
            }

            const isValid = await this.validateCoupon(couponCode);

            if(!isValid){
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code or may be expired!", null, req)
            }

            let _amount:any = parseFloat(amount).toFixed(2);

            const { discount, isFixed  } = isValid;

                let planPrice = parseFloat(amount)
                if(!isFixed){
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    _amount = _amount - discountAmount;
                    if(_amount <= 0){
                        _amount = 0;
                    }
                }
                else{
                    _amount = _amount - parseFloat(discount);
                    if(_amount <= 0){
                        _amount = 0;
                    }
                }

            return this.res.generateResponse(HttpStatus.OK, "Amount", {amount: _amount.toFixed(2)}, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async validateCoupon(code: string){

        let ret:any = false;
        const coupon = await this._couponRepo.createQueryBuilder('Coupons')
        .where("couponCode = :couponCode AND ( expiry_date IS NULL OR expiry_date > :today) AND deleted_at IS NULL", {couponCode: code, today: new Date()})
        .getOne();

        ret = coupon;
        if(!coupon){
            ret = false;
        }else{
            
           if(coupon.noOfUse){
            const details = await this._couponDetRepo.find({
                where: {
                    coupon: {
                        id: coupon.id
                    }
                }
            })

            console.log(details);
            

            if(details.length >= coupon.noOfUse){
                ret = false;
            }
           }

        }


        return ret;

    }


}
