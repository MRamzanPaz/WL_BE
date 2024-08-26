import { Body, Controller, Inject, Post, Request } from '@nestjs/common';
import { RechargeEsimService } from './recharge-esim.service';
import { AuthorizeFWCardDto, CustomerwalletDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesaPalDto, RechargeStipeDto, ValidationFWCardDto } from './recharge-esim.dto';
import { Request as request } from 'express';

@Controller('recharge-esim')
export class RechargeEsimController {

    constructor(
        @Inject('RECHARGE-SERVICE') private _recharge: RechargeEsimService
    ) { }

    @Post('stripe')
    rechargeEsimByStripe(@Body() body: RechargeStipeDto, @Request() req: request) {
        return this._recharge.rechargeEsimByStripe(body, req);
    }

    @Post('fw-mobile-money')
    rechargeEsimByFwMobileMoney(@Body() body: FwMMDto, @Request() req: request) {
        return this._recharge.rechargeEsimByFwMobileMoney(body, req);
    }

    @Post('pawa-pay')
    rechargeEsimByPawaPayMobileMoney(@Body() body: PawaPayDto, @Request() req: request) {
        return this._recharge.rechargeEsimByPawaPayMobileMoney(body, req);
    }

    @Post('pesapal')
    rechargeEsimByPesaPal(@Body() body: PesaPalDto, @Request() req: request) {
        return this._recharge.rechargeEsimByPesaPal(body, req);
    }

    @Post('fw-card')
    rechargeEsimByFwCard(@Body() body: FWCardDto, @Request() req: request) {
        return this._recharge.rechargeEsimByFwCard(body, req);
    }

    @Post('fw-card/authorization')
    authorizeFWCard(@Body() body: AuthorizeFWCardDto, @Request() req: request){
        return this._recharge.authorizeFWCard(body, req);
    }

    @Post('fw-card/validation')
    validateFwCard(@Body() body: ValidationFWCardDto, @Request() req: request){
        return this._recharge.validateFwCard(body, req);
    }

    @Post('customer-wallet')
    rechargeEsimByCustomerWallet(@Body() body: CustomerwalletDto, @Request() req: request){
        return this._recharge.rechargeEsimByCustomerWallet(body, req);
    }

    @Post('dpo')
    rechargeEsimByDPO(@Body() body: DPODto, @Request() req: request){
        return this._recharge.purchaseEsimByDPO(body, req);
    }

    @Post('dpo/verfiy-payment')
    verifyDpoPayment(@Body() body: DpoVerifyDto, @Request() req: request){
        return this._recharge.verifyDpoPayment(body, req);
    }

    @Post('elipa')
    rechargeEsimByElipa(@Body() body: ElipaDto, @Request() req: request){
        return this._recharge.rechargeEsimByElipa(body, req)
    }

    @Post('elipa/verfiy-payment')
    verifyElipaPayment(@Body() body: ElipaVerifyDto, @Request() req: request){
        return this._recharge.verifyElipaPayment(body, req);
    }

    @Post('paystack')
    rechargeEsimByPaystack(@Body() body: PayStackDto, @Request() req: request){
        return this._recharge.rechargeEsimByPaystack(body, req);
    }
}
