import { Body, Controller, Get, Inject, Param, Post, Put, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { AuthenitcateCustomer, ChangePassword, ChangeVerificationStatus, CreateCustomer, PaginationDto, RechargeCountryDto, RechargeEsimDPODto, RechargeEsimDto, RechargeEsimFWCardAuthorizeDto, RechargeEsimFWCardDto, RechargePackagesDto, RechargeQueryDto, TopupDto, ValidateFWRechargeDto, WalletRechargeCardDto, WalletTopupMobMoneyDto, WalletTopupPawaPayDto, WalletTopupPesaPalDto } from './customer.dto';
import { CustomerService } from './customer.service';
import { WalletCardDto } from 'src/payments/payments.dto';

@Controller('customer')
export class CustomerController {
    
    constructor(
        @Inject("CUSTOMER-SERVICE") private _customers: CustomerService,
    ){}

    @Post('create')
    createCustomer( @Body() body: CreateCustomer, @Request() req: request ){
        return this._customers.createCustomer(body, req);
    }

    @Post('authenticate')
    authenticateCustomer(@Body() body: AuthenitcateCustomer, @Request() req: request){
        return this._customers.authenticateCustomer(body, req);
    }

    @Get('verify/email/:email')
    verifyEmail( @Param('email') email: string , @Request() req: request){
        return this._customers.verifyEmail(email, req)
    }

    @Get('verify/newuser/email/:email')
    verifyNewUserEmail( @Param('email') email: string , @Request() req: request){
        return this._customers.verifyNewUserEmail(email, req)
    }

    @Put('change/verify/status')
    changeVerificationStatus( @Body() body: ChangeVerificationStatus , @Request() req: request){
        return this._customers.changeVerificationStatus(body, req)
    }

    @Put('change-password')
    changePassword( @Body() body: ChangePassword , @Request() req: request){
        return this._customers.changePassword(body, req)
    }

    @Get('all/pagination')
    getAllPlansByPagination( @Query() params: PaginationDto, @Request() req: request ){
        return this._customers.getAllCustomerByPagination(params, req)
    }

    @Post('topup/card')
    topupWalletWithCard(@Body() body: WalletRechargeCardDto, @Request() req: request){
        return this._customers.topupWallet(body, req);
    }

    @Post('topup/flutter-wave')
    topupWalletWithMobileMoney( @Body() body: WalletTopupMobMoneyDto, @Request() req:request){
        return this._customers.topupWalletWithMobileMoney(body, req);
    }

    @Post('topup/mobile-money/pawa-pay')
    topupWalletWithPawaPay(@Body() body: WalletTopupPawaPayDto, @Request() req: request){
        return this._customers.topupWalletWithPawaPay(body, req);
    }
    @Get('topup/mobile-money/pawa-pay/status/:trans_id')
    getPawaPayStatus(@Param('trans_id') trans_id: string, @Request() req: request){
        return this._customers.getPawaPayStatus(trans_id, req);
    }

    @Post('topup/mobile-money/pesa-pal')
    topupWalletWithPesaPal(@Body() body: WalletTopupPesaPalDto, @Request() req: request){
        return this._customers.topupWalletWithPesaPal(body, req);
    }
    
    @Get('topup/mobile-money/payment/status/:trans_id')
    getPaymentStatusWallet(@Param('trans_id') trans_id: string, @Request() req: request){
        return this._customers.getPaymentStatusWallet(trans_id, req);
    }

    @Get('details/:customer_id')
    getCustomerDetailById(@Param('customer_id') customer_id: string, @Request() req: request) {
        return this._customers.getCustomerDetilsById(customer_id, req);
    }

    @Get('recharge/eSim/list')
    getAllRechargeAbleEsims(@Request() req: request){
        return this._customers.getAllRechargeAllEsim(req);
    }

    @Post('recharge/eSim')
    rechargeEsim(@Body() body: RechargeEsimDto, @Request() req: request){
        return this._customers.rechargeEsim(body, req);
    }

    @Get('recharge/eSim/orderStatus')
    getRechargeEsimOrderStatus(@Query() query: RechargeQueryDto,  @Request() req: request){
        return this._customers.getRechargeEsimOrderStatus(query, req)
    }
    
    @Get('recharge/data/:iccid')
    getAllRechargeData(@Param('iccid') iccid:string, @Request() req: request){
        return this._customers.getAllRechargeData(iccid, req);
    }

    @Get('recharge/country')
    getAllRechargePackages(@Query() query:RechargeCountryDto, @Request() req: request){
        return this._customers.getAllRechargeCountry(query, req);
    }

    @Get('recharge/packages')
    getAllRechargeablePackage( @Query() query: RechargePackagesDto, @Request() req: request ){
        return this._customers.getAllpackages(query, req);
    }

    @Get('recharge/payment/status/:order_id')
    getPaymentStatus(@Param('order_id') order_id: string, @Request() req: request){
        return this._customers.getPaymentStatus(order_id, req);
    }

    @Get('eSim/list/all')
    getAlleSimList(@Request() req: request){
        return this._customers.getAlleSimList(req)
    }

    @Get('eSim/details/:iccid')
    getEsimDetailsByIccid(@Param('iccid') iccid: string, @Request() req: request){
        return this._customers.getEsimDetailsByIccid(iccid, req)
    }

    @Post('recharge/esim/fwCard')
    rechargeEsimWithFWCard(@Body() body: RechargeEsimFWCardDto, @Request() req: request){
        return this._customers.rechargeEsimWithFWCard(body, req);
    }

    @Post('recharge/esim/fwCard/authorize')
    rechargeEsimWithFWCardAuthorize(@Body() body: RechargeEsimFWCardAuthorizeDto, @Request() req: request){
        return this._customers.rechargeEsimWithFWCardAuthorize(body, req);
    }


    @Post('recharge/esim/fwCard/validate')
    rechargeEsimWithFWCardValidate(@Body() body: ValidateFWRechargeDto, @Request() req: request){
        return this._customers.rechargeEsimWithFWCardValidate(body, req);
    }

    @Post('recharge/esim/dpo')
    rechargeEsimWithDPO(@Body() body: RechargeEsimDPODto, @Request() req: request){
        return this._customers.rechargeEsimWithDPO(body, req);
    }

    @Get('verify-payment/dpo/:order_id')
    verifyDPOPaymentForRecharge(@Param('order_id') order_id:string, @Request() req: request){
        return this._customers.verifyDPOPaymentForRecharge(order_id, req);
    }
}
