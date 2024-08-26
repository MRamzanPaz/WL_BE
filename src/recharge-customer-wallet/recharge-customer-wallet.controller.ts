import { Body, Controller, Inject, Post, Req, Request } from '@nestjs/common';
import { RechargeCustomerWalletService } from './recharge-customer-wallet.service';
import { AuthorizeFWCardDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesapalDto, StripeDto, ValidationFWCardDto } from './recharge-customer-wallet.dto';
import { Request as request } from 'express';

@Controller('recharge-customer-wallet')
export class RechargeCustomerWalletController {

    constructor(
        @Inject('WALLET-SERVICE') private _wallet: RechargeCustomerWalletService
    ){}

    @Post('stripe')
    rechargeWalletWithStripe(@Body() body: StripeDto, @Request() req: request){
        return this._wallet.rechargeWalletWithStripe(body, req);
    }

    @Post('fw-mobile-money')
    rechargeWalletWithFWMobileMoney(@Body() body: FwMMDto, @Request() req: request){
        return this._wallet.rechargeWalletWithFWMobileMoney(body, req)
    }

    @Post('pawa-pay')
    rechargeWalletWithPawaPay(@Body() body: PawaPayDto, @Request() req: request){
        return this._wallet.rechargeWalletWithPawaPay(body, req);
    }

    @Post('pesapal')
    rechargeWalletWithPesaPal(@Body() body: PesapalDto, @Request() req: request){
        return this._wallet.rechargeWalletWithPesaPal(body, req);
    }

    @Post('fw-card')
    rechargeWalletWithFWCard(@Body() body: FWCardDto, @Request() req: request){
        return this._wallet.rechargeWalletWithFWCard(body, req);
    }

    @Post('fw-card/authorization')
    authorizeFWCard(@Body() body: AuthorizeFWCardDto, @Request() req: request){
        return this._wallet.authorizeFWCard(body, req);
    }

    @Post('fw-card/validation')
    validateFwCard(@Body() body: ValidationFWCardDto, @Request() req: request){
        return this._wallet.validateFwCard(body, req);
    }

    @Post('dpo')
    rechargeWalletWithDPO(@Body() body: DPODto, @Request() req: request){
        return this._wallet.rechargeWalletWithDPO(body, req);
    }

    @Post('dpo/verfiy-payment')
    verifyDpoPayment(@Body() body: DpoVerifyDto, @Request() req: request){
        return this._wallet.verifyDpoPayment(body, req);
    }

    @Post('elipa')
    rechargeWalletWithElipa(@Body() body: ElipaDto, @Request() req: request){
        return this._wallet.rechargeWalletWithElipa(body, req);
    }

    @Post('elipa/verfiy-payment')
    verifyElipaPayment(@Body() body:ElipaVerifyDto, @Request() req:request){
        return this._wallet.verifyElipaPayment(body, req);
    }

    @Post('paystack')
    rechargeWalletWithPaystack(@Body() body: PayStackDto, @Request() req: request){
        return this._wallet.rechargeWalletWithPaystack(body, req);
    }
}
