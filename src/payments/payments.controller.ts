import { Body, Controller, Get, Inject, Post, Query, Render, Request, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request as request, Response } from 'express';
import { CardDto, CreateTokenParams, CustomerWalletTopup, StripeCheckoutDto, WalletCardDto } from './payments.dto';


@Controller('payments')
export class PaymentsController {
    
    constructor(
        @Inject('PAYMENTS-SERVICE') private _payments: PaymentsService
    ){}
    
    @Get('stripe/checkout')
    orderCheckout(@Query() params:StripeCheckoutDto, @Request() req: request, @Res() res: Response) {
        return this._payments.stripeCheckout(params, req, res);
      }
    
    @Get('stripe/wallet/checkout')
    walletTopup(@Query() params: CustomerWalletTopup, @Request() req: request , @Res() res: Response){
        return this._payments.walletCheckout(params, req,res);
    }

    @Post('stripe/token')
    createCheckoutToken( @Query() params: CreateTokenParams,  @Body() body: CardDto, @Request() req: request , @Res() res: Response){

        return this._payments.createStripeToken(params, body, req, res);
    }

    @Post('stripe/wallet/transaction')
    walletTransaction( @Query() params: CustomerWalletTopup,  @Body() body: WalletCardDto, @Request() req: request , @Res() res: Response){
        return this._payments.performWalletTransaction(params, body, req, res)
    }

    @Post('mobile-money')
    createMobileMoneyCharge(@Body() body: any,@Request() req: request){
        // return body;
        return this._payments.createMobileMoneyCharge(req)
    }

    @Get('dpo/mobileOptions')
    getAllDpoMobileOptions(){}
}
