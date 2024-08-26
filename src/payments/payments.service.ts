import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CardDto, CreateTokenParams, CustomerWalletTopup, StripeCheckoutDto, WalletCardDto } from './payments.dto';
import { ResponseService } from 'src/shared/service/response.service';
import Stripe from 'stripe';
import { Transactions } from 'src/entities/transactions.entity';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import convertor from 'convert-string-to-number';
import * as Flutterwave from 'flutterwave-node-v3';
@Injectable()
export class PaymentsService {
    
    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, {apiVersion: '2020-08-27'})
    private readonly FLUTTERWAVE = new Flutterwave(process.env.FLUTTER_WAVE_PK, process.env.FLUTTER_WAVE_SK)

    constructor(
        @InjectRepository(EsimOrders)
        private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(Transactions)
        private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(Customers)
        private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(CustomerWallet)
        private readonly _customerWalletRepo: Repository<CustomerWallet>,
        @InjectRepository(CustomerWalletHistory)
        private readonly _customerWalletHisRepo: Repository<CustomerWalletHistory>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
    ){}

    async stripeCheckout(params: StripeCheckoutDto, req: Request, res: Response){

        try {
            
            const { order_id } = params;

            const updateOrder = await this._ordersRepo.createQueryBuilder('Orders')
            .update()
            .set({
                status: 'IN-PROCESS'
            })
            .where("id = :id", {id: order_id})
            .execute()

            const stripCheckoutPage = `stripe/checkout-page`;
            return res.render(stripCheckoutPage, { postUrl: `token?order_id=${order_id}` })

        } catch (error) {
            return res.send({
                code: 500,
                message: 'internal server error!',
                data: null
            })
        }

    }

    async createStripeToken(params: CreateTokenParams, body: CardDto, req: Request, res: Response ){

        try {

            const {cardNumber, cvv, month, year} = body;
            const {order_id} = params;
            
            const token = await this.STRIPE.tokens.create({
                card: {
                    number: cardNumber,
                    exp_month: month,
                    exp_year: year,
                    cvc: cvv
                }
            })

            const Order = await this._ordersRepo.findOne({
                where: {
                    id: order_id
                },
                relations: {
                    plan: true
                }
            })

            const transactionPayload: Transactions | any = {
                transaction_token: token.id,
                order: Order,
                status: 'PENDING',
                note: `purchase ${Order.plan.name}`
            }

            const createTransaction: any = this._transRepo.create(transactionPayload)
            await this._transRepo.save(createTransaction)



            return res.redirect(`${process.env.REDIRECT_URL}checkout?transaction_id=${createTransaction.id}`)


        } catch (error) {
            // console.log(error)
            return this.res.generateError(error, req)
        }

    }

    async walletCheckout(params: CustomerWalletTopup,req: Request, res: Response){
        
        const stripCheckoutPage = `stripe/customer-wallet-topup`;
        return res.render(stripCheckoutPage, { postUrl: `transaction?customer_id=${params.customer_id}` })

    }

    async performWalletTransaction(params: CustomerWalletTopup , body: WalletCardDto,req: Request, res: Response){

        try {
            
        const {cardNumber, cvv, month, year , amount} = body;
        const { customer_id } = params;
        
        const customer = await this._customerRepo.findOne({
        where: {
                id: parseInt(customer_id),
                deleted_at: IsNull()
            },
            relations: {
                wallet: true
            }
        })

        // console.log(customer)

        const token = await this.STRIPE.tokens.create({
            card: {
                number: cardNumber,
                exp_month: month,
                exp_year: year,
                cvc: cvv
            }
        })

        const charge = await this.STRIPE.charges.create({
            amount: parseFloat(amount) * 100,
            currency: 'usd',
            source: token.id,
            description: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`
        })

        // store transaction
        const createTransaction = this._transRepo.create({
            transaction_token: token.id,
            note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
            status: 'COMPLETED',
            amount: amount,
        })
        await this._transRepo.save(createTransaction);

        // update customer wallet
        const _floatAmount = convertor(customer.wallet.wallet_balance)
        const updatedAmount = _floatAmount + parseFloat(amount);
        await this._customerWalletRepo.createQueryBuilder('CustomerWallet')
        .update()
        .set({
            wallet_balance: updatedAmount
        })
        .where("id = :id", {id: customer.wallet.id})
        .execute()

        // create wallet history
        const walletHistory = this._customerWalletHisRepo.create({
            message: 'You have been topup your wallet',
            credit: convertor(amount),
            // transaction: createTransaction
        })

        await this._customerWalletHisRepo.save(walletHistory);


        return res.redirect(process.env.REDIRECT_URL + 'user_dashboard/dashboard')

        } catch (error) {
            // console.log(error)
            return res.send({
                code: HttpStatus.INTERNAL_SERVER_ERROR,
                message: "Something went wrong",
                data: null
            })
        }

    }

    async createMobileMoneyCharge(req: Request){

        try {

            const payload = {
                phone_number: '25454709929220',
                amount: 1500,
                currency: 'KES',
                email: 'shafiq.paz.agency@gmail.com',
                tx_ref: 'MC-15852113s09v5050e8',
            }
            const res = await this.FLUTTERWAVE.MobileMoney.mpesa(payload)

            return res
            
        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

}
