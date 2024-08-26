import { Body, Controller, Get, Inject, Param, Post, Req, Request } from '@nestjs/common';
import { PurchaseEsimService } from './purchase-esim.service';
import { Request as request } from 'express';
import {FreePlanDto, AuthorizeFWCardDto, CustomerwalletDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesaPalDto, StripDto, ValidationFWCardDto } from './purchase-esim.dto';

@Controller('purchase-esim')
export class PurchaseEsimController {

    constructor(
        @Inject('PURCHASE-ESIM-SERIVE') private _purchase: PurchaseEsimService
    ) { }

    @Post('free-plan')
getFreePlan(@Body() body: FreePlanDto, @Request() req: request) {
    return this._purchase.getFreePlan(body, req);
}
    @Post('stripe')
    purchaseEsimByStripe(@Body() body: StripDto, @Request() req: request) {
        return this._purchase.purchaseEsimByStripe(body, req);
    }

    @Post('fw-mobile-money')
    purchaseEsimByFwMobileMoney(@Body() body: FwMMDto, @Request() req: request) {
        return this._purchase.purchaseEsimByFwMobileMoney(body, req);
    }

    @Post('pawa-pay')
    purchaseEsimByPawaPayMobileMoney(@Body() body: PawaPayDto, @Request() req: request) {
        return this._purchase.purchaseEsimByPawaPayMobileMoney(body, req);
    }

    @Post('pesapal')
    purchaseEsimByPesaPal(@Body() body: PesaPalDto, @Request() req: request) {
        return this._purchase.purchaseEsimByPesaPal(body, req);
    }

    @Post('fw-card')
    purchaseEsimByFwCard(@Body() body: FWCardDto, @Request() req: request) {
        return this._purchase.purchaseEsimByFwCard(body, req);
    }

    @Post('fw-card/authorization')
    authorizeFWCard(@Body() body: AuthorizeFWCardDto, @Request() req: request) {
        return this._purchase.authorizeFWCard(body, req);
    }

    @Post('fw-card/validation')
    validateFwCard(@Body() body: ValidationFWCardDto, @Request() req: request) {
        return this._purchase.validateFwCard(body, req);
    }

    @Post('customer-wallet')
    purchaseEsimByCustomerWallet(@Body() body: CustomerwalletDto, @Request() req: request) {
        return this._purchase.purchaseEsimByCustomerWallet(body, req);
    }

    @Post('dpo')
    purchaseEsimByDPO(@Body() body: DPODto, @Request() req: request) {
        return this._purchase.purchaseEsimByDPO(body, req);
    }

    @Post('dpo/verfiy-payment')
    verifyDpoPayment(@Body() body: DpoVerifyDto, @Request() req: request) {
        return this._purchase.verifyDpoPayment(body, req);
    }

    @Post('elipa')
    purchaseEsimByElipa(@Body() body: ElipaDto, @Request() req: request) {
        return this._purchase.purchaseEsimByElipa(body, req)
    }

    @Post('elipa/verfiy-payment')
    verifyElipaPayment(@Body() body: ElipaVerifyDto, @Request() req: request) {
        return this._purchase.verifyElipaPayment(body, req);
    }

    @Post('paystack')
    purchaseEsimByPayStack(@Body() body: PayStackDto, @Request() req: request) {
        return this._purchase.purchaseEsimByPayStack(body, req);
    }



}
