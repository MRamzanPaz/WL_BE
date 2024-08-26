import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { Customers } from 'src/entities/customer.entity';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { Plans } from 'src/entities/plans.entites';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { MailService } from 'src/mail/mail.service';
import { ApiService } from 'src/shared/service/api.service';
import { GeneralService } from 'src/shared/service/general.service';
import { JwtService } from 'src/shared/service/jwt.service';
import { ResponseService } from 'src/shared/service/response.service';
import { SocketGateway } from 'src/socket/socket.gateway';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AuthorizeFWCardDto, CustomerwalletDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesaPalDto, RechargeStipeDto, ValidationFWCardDto } from './recharge-esim.dto';
import Stripe from 'stripe';
import convertor from 'convert-string-to-number';
import * as moment from 'moment';

@Injectable()
export class RechargeEsimService {

    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });
    constructor(
        @InjectRepository(Customers) private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(Plans) private readonly _plansRepo: Repository<Plans>,
        @InjectRepository(Coupons) private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(CouponsDetails) private readonly _couponDetRepo: Repository<CouponsDetails>,
        @InjectRepository(TopupOrders) private readonly _ordersRepo: Repository<TopupOrders>,
        @InjectRepository(Transactions) private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(MobileMoneyTransactions) private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(PawapayTransactions) private readonly _pawapayTransactions: Repository<PawapayTransactions>,
        @InjectRepository(AccountingReport) private readonly _accReportRepo: Repository<AccountingReport>,
        @Inject("RESPONSE-SERVICE") private _res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        @Inject('JWT-SERVICE') private _jwt: JwtService,
        private _mail: MailService,
        private _socket: SocketGateway
    ) { }

    // RECHARGE ESIM WITH STRIPE START

    async rechargeEsimByStripe(body: RechargeStipeDto, req: Request) {
        try {

            const { iccid, plan_id, stripe_token, coupon } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 1,
                allow_mobile_money: false,
                mobile_money: null,
                token: stripe_token,
                customer
            }

            let order = await this.preOrderProcess(preOrderPayload);

            // stripe charge integration

            const stripePayload = {
                amount: amount,
                stripe_token: stripe_token,
                plan: plan
            }

            order = await this.stripePaymentCharge(stripePayload);

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: iccid,
                plan_id: plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }


            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: true
            }

            const data = await this.postOrderProcesses(postOrderPayload)

            return this._res.generateResponse(HttpStatus.OK, "Recharge completed", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // RECHARGE ESIM WITH STRIPE END

    // RECHARGE ESIM WITH FLUTTER-WAVE MOBILE MONEY START
    async rechargeEsimByFwMobileMoney(body: FwMMDto, req: Request) {
        try {


            const { iccid, plan_id, coupon, phone_number, currency, network } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);
            const token = this._general.generateTransactionRef();


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 2,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: null
                },
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);


            const transactionPayload = {
                phone_number: order.transaction.mobileMoney.phone_number,
                amount: amount,
                currency: order.transaction.mobileMoney.currency,
                email: order.customer.email,
                tx_ref: order.transaction.mobileMoney.tr_ref,
                network: order.transaction.mobileMoney.network
            };

            const paymentIntent = await this._general.createMobileMoneyPaymentIntent(transactionPayload);

            if (paymentIntent.code != 1) {
                throw new HttpException("Something went wrong!", HttpStatus.BAD_REQUEST);
            }

            return this._res.generateResponse(HttpStatus.OK, `Please approved payment from ${network}`, paymentIntent.data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async flutterwaveWebhookRechargeComplete(order: TopupOrders, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })


        } catch (error) {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }
    }


    // RECHARGE ESIM WITH FLUTTER-WAVE MOBILE MONEY END

    // RECHARGE ESIM WITH PAWA-PAY MOBILE MONEY START

    async rechargeEsimByPawaPayMobileMoney(body: PawaPayDto, req: Request) {
        try {

            const { iccid, plan_id, coupon, phone_number, currency, network, country_code } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);
            const token = this._general.generateDepositId();


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 4,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: country_code
                },
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            // convert amount into selected country currency
            const convertedAmount = await this._general.currencyConvertorV2(order.transaction.mobileMoney.currency, amount)
            const transactionPayload = {
                depositId: order.transaction.mobileMoney.tr_ref,
                amount: convertedAmount.toFixed(0),
                currency: order.transaction.mobileMoney.currency,
                country: order.transaction.mobileMoney.country_code,
                correspondent: order.transaction.mobileMoney.network,
                payer: {
                    type: "MSISDN",
                    address: {
                        value: order.transaction.mobileMoney.phone_number
                    }
                },
                customerTimestamp: new Date(),
                statementDescription: `payment against plan`
            }

            const pawapayIntent = await this._api.pawaPayCreateDeposit(transactionPayload);

            if (pawapayIntent.status != 'ACCEPTED') {
                throw new HttpException("Something Went wrong in payment process, please try again", HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const data = {

                tr_ref: order.transaction.transaction_token,
                redirect: false,
                redirectUrl: null,
                msg: 'Please approved payment!'
            }

            return this._res.generateResponse(HttpStatus.OK, `Please approved your payment`, data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async pawapayWebhookRechargeComplete(order: TopupOrders, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: true
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })


        } catch (error) {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }
    }

    // RECHARGE ESIM WITH PAWA-PAY MOBILE MONEY END

    // RECHARGE ESIM WITH PESA-PAL START
    async rechargeEsimByPesaPal(body: PesaPalDto, req: Request) {
        try {

            const { iccid, plan_id, coupon } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);
            const token = this._general.generateDepositId();


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 5,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const transactionPayload = {
                id: order.transaction.transaction_token,
                currency: 'USD',
                amount: amount,
                description: `purchase eSim plan`,
                callback_url: `${process.env.REDIRECT_URL}verifypayment?order_no=${order.id}&tr_rf=${order.transaction.transaction_token}&method=pesapal&type=TOPUP`,
                redirect_mode: "",
                notification_id: process.env.PESAPAL_IPN,
                billing_address: {
                    email_address: order.customer.email,
                    first_name: order.customer.firstname,
                    last_name: order.customer.lastname
                }

            }

            const transactionIntent = await this._api.submitTransaction(transactionPayload);

            if (transactionIntent.status != "200") {
                throw new HttpException("Something went wrong in payment process", HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const data = {
                tr_ref: order.transaction.transaction_token,
                redirect: true,
                redirectUrl: transactionIntent.redirect_url,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async pesapalWebhookRechargeComplete(order: TopupOrders, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })


        } catch (error) {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }
    }
    // RECHARGE ESIM WITH PESA-PAL END

    // RECHARGE ESIM WITH FW-CARD START

    async rechargeEsimByFwCard(body: FWCardDto, req: Request) {
        try {


            const { iccid, plan_id, coupon, ...card_details } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);
            const token = this._general.generateTransactionRef(true);


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 2,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            // FW card implementation
            const intentPayload = {
                token,
                amount,
                customer_email: customer.email,
                ...card_details,
            }

            const fwCardIntent = await this._general.createFwCardIntent(intentPayload);

            if (fwCardIntent?.status != 'success') {
                throw new HttpException("Something went wrong in payment process", HttpStatus.BAD_REQUEST)
            }

            const data = {
                tr_ref: order.transaction.transaction_token,
                redirect: fwCardIntent.meta.authorization.mode == 'redirect' ? true : false,
                redirectUrl: fwCardIntent.meta.authorization.redirect ? fwCardIntent.meta.authorization.redirect : null,
                authorization: fwCardIntent.meta.authorization.mode,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async authorizeFWCard(body: AuthorizeFWCardDto, req: Request) {
        try {

            const { tr_ref } = body;

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        transaction_token: tr_ref,
                        status: 'PENDING'
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            if (!order) throw new HttpException("Invalid Card details", HttpStatus.BAD_REQUEST);


            let payload: any = {
                cardHolder_fullname: body.cardHolder_fullname,
                card_number: body.card_number,
                card_cvc: body.card_cvc,
                card_month: body.card_month,
                card_year: body.card_year,
                token: tr_ref,
                amount: order.transaction.amount,
                customer_email: order.customer.email,
            }

            if (body.authorization == 'avs_noauth') {

                payload = {
                    ...payload,
                    authorization: {
                        mode: body.authorization,
                        city: body.city,
                        address: body.address,
                        state: body.state,
                        country: body.country,
                        zipcode: body.zipcode
                    }
                }

            } else {
                payload = {
                    ...payload,
                    authorization: {
                        mode: body.authorization,
                        pin: body.pin
                    }
                }
            }

            const chargeIntiated = await this._general.authorizedFWCard(payload);


            if (chargeIntiated?.status != 'success') throw new HttpException('Something went wrong in payment process', HttpStatus.BAD_REQUEST);

            const data = {
                tr_ref: order.transaction.transaction_token,
                flw_ref: chargeIntiated.data.flw_ref,
                redirect: chargeIntiated.meta.authorization.mode == 'redirect' ? true : false,
                redirectUrl: chargeIntiated.meta.authorization.redirect ? chargeIntiated.meta.authorization.redirect : null,
                authorization: chargeIntiated.meta.authorization.mode,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async validateFwCard(body: ValidationFWCardDto, req: Request) {
        try {

            const { tr_ref, otp, flw_ref } = body;

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        transaction_token: tr_ref,
                        status: 'PENDING'
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            if (!order) throw new HttpException("Invalid Card details", HttpStatus.BAD_REQUEST);

            const validatePayload = {
                otp: otp,
                flw_ref: flw_ref
            }

            const validate = await this._general.validateFWCard(validatePayload);

            if (validate?.status != 'success') throw new HttpException('Something went wrong in payment process', HttpStatus.BAD_REQUEST);

            const data = {
                tr_ref: order.transaction.transaction_token,
                redirect: false,
                redirectUrl: null,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // RECHARGE ESIM WITH FW-CARD END

    // RECHARGE ESIM WITH CUSTOMER-WALLET START
    async rechargeEsimByCustomerWallet(body: CustomerwalletDto, req: Request) {
        try {

            const { iccid, plan_id, coupon } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 3,
                allow_mobile_money: false,
                mobile_money: null,
                token: 'WALLET',
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const walletTransaction = await this._general.performWalletTransaction(order, amount, `purchase ${order.plan.name}`);

            if (!walletTransaction) {
                throw new HttpException("Unable to recharge esim through wallet, please contact support!", HttpStatus.BAD_REQUEST);
            }

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: iccid,
                plan_id: plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }


            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload)

            return this._res.generateResponse(HttpStatus.OK, "Recharge completed", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
    // RECHARGE ESIM WITH CUSTOMER-WALLET END

    // RECHARGE ESIM WITH DPO START

    async purchaseEsimByDPO(body: DPODto, req: Request) {
        try {

            const { iccid, plan_id, coupon } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);

            const payload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'createToken',
                Transaction: {
                    PaymentAmount: amount,
                    PaymentCurrency: 'USD',
                    CompanyRef: iccid,
                    RedirectURL: `${process.env.DPO_REDIRECT_URL}?iccid=${iccid}&type=TOPUP&method=DPO`,
                    BackURL: process.env.DPO_REDIRECT_URL,
                    customerEmail: customer.email,
                    customerFirstName: customer.firstname,
                    customerLastName: customer.lastname
                },
                Services: {
                    Service: {
                        ServiceType: process.env.DPO_SERVICE_TYPE,
                        ServiceDescription: 'purchase ' + plan.name,
                        ServiceDate: moment().format('YYYY/MM/DD HH:MM')
                    }
                }
            }

            const token = await this._general.generateDPOToken(payload);


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 6,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const data = {

                tr_ref: order.transaction.transaction_token,
                redirect: true,
                redirectUrl: `${process.env.DPO_PAYMENT_URL}${token}`,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async verifyDpoPayment(body: DpoVerifyDto, req: Request) {
        try {

            const { tr_ref } = body;

            const dpoVerifypayload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'verifyToken',
                // TransactionToken: process.env.DPO_ACTIVE_MODE == 'TEST' ? process.env.DPO_TEST_TOKEN : pureToken
                TransactionToken: tr_ref
            }

            const verifyTokenResponse: any = await this._api.dpoVerifyToken(dpoVerifypayload);

            if (verifyTokenResponse.API3G.Result._text != '000') throw new HttpException("your transaction not paid yet", HttpStatus.BAD_REQUEST);

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        status: 'PENDING',
                        transaction_token: tr_ref
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            if (!order) throw new HttpException("Invalid Transaction Token", HttpStatus.BAD_REQUEST);

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(order.transaction.transaction_token, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(order.transaction.transaction_token, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Recharge Completed", data, req)

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // RECHARGE ESIM WITH DPO END

    // RECHARGE ESIM WITH E-lipa START
    async rechargeEsimByElipa(body: ElipaDto, req: Request) {
        try {

            const { iccid, plan_id, coupon, phone_number, country_code } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);

            const token = await this._general.generateDepositId();

            // elipa Integration
            const elipaPayload = {
                order_no: `TOPUP-${token}`,
                amount: amount,
                customer_email: customer.email,
                phone_number: phone_number,
                country_iso3: country_code,
                token: token,
                type: 'TOPUP'
            }

            const elipaResouce = await this._general.getElipaResource(elipaPayload);

            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 7,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: null,
                    network: null,
                    country_code: country_code
                },
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const data = {
                tr_ref: order.transaction.transaction_token,
                redirect: true,
                redirectUrl: elipaResouce.redirect_URL,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async verifyElipaPayment(body: ElipaVerifyDto, req: Request) {
        try {

            console.log("Elipa Status:", body);
            const { tr_ref, trans_status } = body;

            if (trans_status != 'aei7p7yrx4ae34') {
                throw new HttpException("Your transaction has been failed,  please contact support", HttpStatus.BAD_REQUEST);
            }

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        status: 'PENDING',
                        transaction_token: tr_ref
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            if (!order) throw new HttpException("Invalid Transaction Token", HttpStatus.BAD_REQUEST);

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(order.transaction.transaction_token, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(order.transaction.transaction_token, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Recharge Completed", data, req)

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
    // RECHARGE ESIM WITH E-lipa END

    // RECHARGE ESIM WITH PAY-STACK START

    async rechargeEsimByPaystack(body: PayStackDto, req: Request) {
        try {

            const { iccid, plan_id, coupon } = body;
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);

            const TopupData = { customer_id, plan_id }
            const { customer, plan } = await this.validateTopupRequest(TopupData);

            const amount = await this.calculatePlanPrice(plan.price, coupon);

            // initialize paystack payment
            const convertedAmount = parseInt(await this._general.currencyConvertorV2('NGN', amount))
            const payStackPayload = {
                email: customer.email,
                amount: convertedAmount,
                callback_url: `${process.env.PAYSTACK_REDIRECT_URL}?method=paystack&type=TOPUP`,
                metadata: { cancel_action: process.env.REDIRECT_URL }
            }

            const paymentIntent = await this._api.payStackInitializePayment(payStackPayload);

            const token = paymentIntent.data.reference


            const preOrderPayload = {
                iccid,
                coupon,
                amount,
                plan,
                order_by: 5,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                customer
            }

            const order = await this.preOrderProcess(preOrderPayload);


            const data = {
                tr_ref: order.transaction.transaction_token,
                redirect: true,
                redirectUrl: paymentIntent.data.authorization_url,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async paystackWebhookRechargeComplete(order: TopupOrders, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })

            // SM recharge (apply new bundle to esim)

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                throw new HttpException(applied.message, HttpStatus.BAD_REQUEST)
            }

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            const postOrderPayload = {
                order,
                sm_order_data: applied.data,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })


        } catch (error) {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }
    }

    // RECHARGE ESIM WITH PAY-STACK END


    private async validateTopupRequest(data: any): Promise<TopupData> {

        const { customer_id, plan_id } = data

        const customer = await this._customerRepo.findOne({
            where: {
                deleted_at: IsNull(),
                id: customer_id
            },
            relations: {
                wallet: true
            }
        })

        if (!customer) throw new HttpException("Something went wrong with customer details", HttpStatus.BAD_REQUEST);

        const plan = await this._plansRepo.findOne({
            where: {
                id: plan_id,
                deleted_at: IsNull()
            },
            relations: {
                countires: true
            }
        })

        if (!plan) throw new HttpException("Selected plan not found", HttpStatus.BAD_REQUEST);


        const returnElements: TopupData = {
            customer: customer,
            plan: plan
        }

        return returnElements;

    }

    private async calculatePlanPrice(plan_price: string, coupon_code: string): Promise<number> {

        if (!coupon_code) {

            const floatedAmount: string = parseFloat(plan_price).toFixed(2); // here is fixed plan price to 2 decimal points
            const amountConvertedIntoNumber: number = convertor(floatedAmount); // this convertor required amount should be string
            return amountConvertedIntoNumber;

        }

        // coupon validation start
        const coupon = await this._couponRepo.createQueryBuilder('Coupons')
            .where("couponCode = :couponCode AND ( expiry_date IS NULL OR expiry_date > :today) AND deleted_at IS NULL", { couponCode: coupon_code, today: new Date() })
            .getOne();

        if (!coupon || coupon.remainingUse == 0) throw new HttpException("Coupon is expired", HttpStatus.BAD_REQUEST);

        if (coupon.isFixed) {

            const floatedPlanPrice: string = parseFloat(plan_price).toFixed(2); // here is fixed plan price to 2 decimal points
            const PlanPriceConvertedIntoNumber: number = convertor(floatedPlanPrice); // this convertor required amount should be string
            const amountConvertedIntoNumber = PlanPriceConvertedIntoNumber - coupon.discount;
            if (amountConvertedIntoNumber < 0) {
                return 0
            }
            return amountConvertedIntoNumber;

        } else {

            // calculate discount in %
            const discount = (coupon.discount / 100) * convertor(parseFloat(plan_price).toFixed(2));

            const calculateAmount = convertor(parseFloat(plan_price).toFixed(2)) - discount;

            return convertor(calculateAmount.toFixed(2))

        }

        // coupon validation end

    }

    private async preOrderProcess(data: any): Promise<TopupOrders> {

        try {

            const { iccid, coupon, amount, plan, order_by, allow_mobile_money, mobile_money, token, customer } = data;

            let mobileMoney: any = null;

            if (allow_mobile_money) {

                mobileMoney = this._MobileMoneyRepo.create({
                    phone_number: mobile_money.phone_number,
                    currency: mobile_money.currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: mobile_money.network,
                    country_code: mobile_money.country_code
                })

                await this._MobileMoneyRepo.save(mobileMoney);


            }
            const transaction = this._transRepo.create({
                transaction_token: token,
                amount: amount,
                status: 'PENDING',
                note: `roambuddy customer: (${customer.email}) topup ${plan.name} on ${iccid}`,
                mobileMoney: mobileMoney
            })

            await this._transRepo.save(transaction);


            const newOrder = this._ordersRepo.create({

                coupon_code: coupon,
                order_by: order_by,
                customer: customer.id,
                plan: plan.id,
                transaction: transaction,
                iccid: iccid

            })
            await this._ordersRepo.save(newOrder);

            if (coupon) {

                const coupon_code = await this._couponRepo.findOne({
                    where: {
                        couponCode: coupon
                    }
                })

                const updateCouponCode = await this._couponRepo.createQueryBuilder('Coupons')
                    .update()
                    .set({
                        remainingUse: coupon_code.remainingUse - 1
                    })
                    .where("couponCode = :coupon_code", { coupon_code: coupon })
                    .execute()

                const couponDetails = this._couponDetRepo.create({
                    coupon: coupon_code,
                    order: null,
                    topup: newOrder
                })

                await this._couponDetRepo.save(couponDetails);

            }

            const order = await this._ordersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: newOrder.id
                },
                relations: {
                    customer: true,
                    plan: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            return order;

        } catch (error) {
            console.log(error);
            throw new HttpException("Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR)
        }

    }

    private async postOrderProcesses(data: any): Promise<any> {

        const { order, sm_order_data, adjuctAccountingReport } = data;

        // update mobileMoney transaction if exist
        if (order.transaction.mobileMoney) {

            await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.mobileMoney.id })
                .execute();

        }

        // update transaction record

        await this._transRepo.createQueryBuilder()
            .update()
            .set({
                status: 'COMPLETED'
            })
            .where("id = :id", { id: order.transaction.id })
            .execute();

        // update order records

        await this._ordersRepo.createQueryBuilder()
            .update()
            .set({
                order_no: sm_order_data.order_no,
                status: 'COMPLETED'
            })
            .where("id = :id", { id: order.id })
            .execute()


        if (adjuctAccountingReport) {

            const accountingReportPayload = {
                iccid: order.iccid
            }
            await this.adjustAccountingReport(accountingReportPayload, order);
        }

        // send recharge mail to customer

        const emailData = {
            to: order.customer.email,
            customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
            order_no: sm_order_data.order_no,
            iccid: order.iccid,
            plan_name: order.plan.name,
            data: order.plan.data,
            validity: order.plan.validity,
            price: order.transaction.amount
        }
        await this._mail.sentRechargeEmail(emailData);


        const resData = {
            order_no: sm_order_data.order_no
        };

        return resData;


    }

    private async adjustAccountingReport(data: any, order: TopupOrders) {

        const convertTrxAmount: any = convertor(order.transaction.amount);
        const convertCostPrice: any = convertor(order.plan?.cost_price);
        let convertTrxfeeToDollar: any;
        let finalAmountAfterDeduction: any;

        if (order.order_by == 1) {
            convertTrxfeeToDollar = (convertTrxAmount * 3) / 100;
            finalAmountAfterDeduction = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
        }

        if (order.order_by == 4) {

            const payload = {
                amount: order.transaction.amount,
                countryCode: order.transaction.mobileMoney.country_code,
                network: order.transaction.mobileMoney.network
            }
            convertTrxfeeToDollar = await this.convertAmount(payload);
            finalAmountAfterDeduction = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
        }

        let coupDiscount: any = 0;
        if (order.coupon_code) {
            coupDiscount = await this.getCouponDisc(order.coupon_code)
        }


        const createreport = this._accReportRepo.create({
            order_date: moment(order.created_at).format('DD MMMM YYYY'),
            order_time: moment(order.created_at).format('HH:MM:SS'),
            order_code: order.order_no,
            transaction_id: order.transaction.id,
            customer_fullname: `${order.customer?.firstname} ${order.customer?.lastname}`,
            customer_email: order.customer?.email,
            iccId: data.iccid,
            plan_name: order.plan?.name,
            data: order.plan?.data,
            validity: order?.plan.validity,
            sale_price_inc_VAT: null,
            sale_price_excl_VAT: order.plan?.price,
            coupon_code: order.coupon_code,
            disc_from_coupon_code: coupDiscount,
            amount_paid: convertTrxAmount,
            cost_price: convertCostPrice,
            payment_mode: this.getPaymentTpe(order.order_by),
            payment_tx_fee: convertTrxfeeToDollar.toFixed(5),
            profit: finalAmountAfterDeduction.toFixed(5)
        });
        await this._accReportRepo.save(createreport);

    }


    private async convertAmount(data: any) {

        const { amount, countryCode, network } = data
        const convertTrxAmountToKHS: any = await this._general.currencyConverter('KES', convertor(amount));

        if (convertTrxAmountToKHS < 101) {
            return 0;
        }
        const getTrxFeeData = await this._pawapayTransactions.findOne({
            where: {
                country_code: countryCode,
                network: network,
                transactionamount_KHS: LessThan(convertTrxAmountToKHS),
                deleted_at: IsNull()
            },
            order: {
                transactionamount_KHS: 'DESC'
            }

        })

        const getTrxFormula = eval(getTrxFeeData.transactionformula)


        const trxFee = getTrxFormula;
        if (trxFee == 0) {
            return 0;
        }
        const convertTrxfeeToDollar: any = await this._general.currencyConverter('USD', trxFee);
        return convertTrxfeeToDollar;
    }

    private async getCouponDisc(coupon: any) {
        const couponDiscount = await this._couponRepo.findOne({
            where: {
                couponCode: coupon,
                deleted_at: IsNull()
            }
        })

        if (!couponDiscount) {
            return 0;
        }

        const discount = couponDiscount.isFixed ? `$${couponDiscount.discount}` : `${couponDiscount.discount}%`;
        return discount;
    }

    private getPaymentTpe(order_by: number) {
        let type = '';
        switch (order_by) {
            case 1:
                type = 'Credit Card';
                break;
            case 2:
                type = 'Mobile Money';
                break;
            case 3:
                type = 'Wallet';
                break;
            case 4:
                type = 'Mobile Money';
                break;
            case 5:
                type = 'PesaPal';
                break;
            case 6:
                type = 'Direct Pay Online';
                break;
            case 7:
                type = 'Mobile Money';
                break;
            default:
                break;
        }

        return type;

    }

    private async stripePaymentCharge(data: StripeCharge): Promise<TopupOrders> {

        try {
            const { amount, stripe_token, plan } = data;

            const charge = await this.STRIPE.charges.create({
                amount: convertor((amount * 100).toFixed(2)),
                currency: 'usd',
                source: stripe_token,
                description: `purchase ${plan.name}`
            });

            const stripe_chToken = charge?.id;

            //update stripe ch token

            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    transaction_token: stripe_chToken
                })
                .where("transaction_token = :transaction_token", { transaction_token: stripe_token })
                .execute();

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        transaction_token: stripe_chToken
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    },
                }
            })

            return order;

        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }


    }

    // ***GENERAL-FUNCTIONS-WITHIN-SERVICE****


}

type StripeCharge = {
    amount: number,
    stripe_token: string,
    plan: Plans
}

type TopupData = {

    customer: Customers,
    plan: Plans
}