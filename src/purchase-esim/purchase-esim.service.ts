import { Body, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { FreePlanDto,AuthorizeFWCardDto, CustomerwalletDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesaPalDto, StripDto, ValidationFWCardDto } from './purchase-esim.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/service/response.service';
import { Customers } from 'src/entities/customer.entity';
import { Plans } from 'src/entities/plans.entites';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { ApiService } from 'src/shared/service/api.service';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Transactions } from 'src/entities/transactions.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { GeneralService } from 'src/shared/service/general.service';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import Stripe from 'stripe';
import convertor from 'convert-string-to-number';
import * as moment from 'moment';
import * as crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { SocketGateway } from 'src/socket/socket.gateway';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, tap } from 'rxjs';
import { DeepPartial } from 'typeorm'; 
@Injectable()
export class PurchaseEsimService {

    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });
    constructor(
        @InjectRepository(Customers) private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(Plans) private readonly _plansRepo: Repository<Plans>,
        @InjectRepository(Coupons) private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(CouponsDetails) private readonly _couponDetRepo: Repository<CouponsDetails>,
        @InjectRepository(EsimOrders) private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(Transactions) private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(MobileMoneyTransactions) private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(PawapayTransactions) private readonly _pawapayTransactions: Repository<PawapayTransactions>,
        @InjectRepository(AccountingReport) private readonly _accReportRepo: Repository<AccountingReport>,
        @Inject("RESPONSE-SERVICE") private _res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        private _mail: MailService,
        private _socket: SocketGateway,
        private _http: HttpService,
    ) { }

    // PURCHASE ESIM WITH STRIP START

    async purchaseEsimByStripe(body: StripDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, stripe_token, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);


            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 1,
                allow_mobile_money: false,
                mobile_money: null,
                token: stripe_token,
                affiliateCode,
            }

            let order = await this.preOrderProcess(preOrderPayload);

            // stripe charge integration

            const payload = {
                amount: amount,
                stripe_token: stripe_token,
                plan: plan
            }

            order = await this.stripePaymentCharge(payload);


            // confirm order on SM
            const confirmOrderPayload = {
                order_id: requestedOrder.data.order_id
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: true
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            return this._res.generateResponse(HttpStatus.OK, "Order Completed", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
  // PURCHASE ESIM WITH STRIP END
    // free plan
    async getFreePlan(body: FreePlanDto, req: Request) {
        try {
            const { customer_id, plan_id, device_id } = body;
    
            const orderData = { customer_id, plan_id, device_id };
            const { customer, plan, device } = await this.validateOrderRequest(orderData);
    
            // Ensure that the plan_id corresponds to the free plan
            // if (plan_id !== 1) {
            //     throw new Error("Invalid plan ID for free plan.");
            // }
    
            // Check if the customer has already activated the free plan
            const existingOrder = await this._ordersRepo.findOne({
                where: {
                    customer: { id: customer_id },  // Reference the customer entity by ID
                    plan: { id: plan_id },          // Reference the plan entity by ID
                    deleted_at: IsNull(),
                    status: 'COMPLETED'
                }
            });
            
    
            if (existingOrder) {
                throw new HttpException("This user has already activated the free plan.", HttpStatus.BAD_REQUEST);
            }
    
            // Pre-order implementation for the free plan
            const requestOrder = {
                plan_id: plan.package_id
            };
            const requestedOrder = await this._api.requestProductOrder(requestOrder);
    
            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code: null,
                customer,
                amount: 0, // Free plan, no cost
                plan,
                device,
                order_by: 1,
                allow_mobile_money: false,
                mobile_money: null,
                token: null, // No token required for free plan
                affiliateCode: null,
            };
    
            const order = await this.preOrderProcess(preOrderPayload);
    
            // Confirm order on SM
            const confirmOrderPayload = {
                order_id: requestedOrder.data.order_id
            };
            const completeOrder = await this._api.completeOrder(confirmOrderPayload);
    
            // Post order implementation
            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: true
            };
    
            const data = await this.postOrderProcesses(postOrderPayload);
    
            return this._res.generateResponse(HttpStatus.OK, "Free Plan Activated Successfully", data, req);
    
        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
    


  

    // ============================================================================== 

    // PURCHASE ESIM WITH FLUTTER-WAVE MOBILE MONEY START

    async purchaseEsimByFwMobileMoney(body: FwMMDto, req: Request) {

        try {

            const { customer_id, plan_id, device_id, coupon_code, phone_number, currency, network, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const token = this._general.generateTransactionRef();

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 2,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: null
                },
                token: token,
                affiliateCode,
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

            const data = {
                ...paymentIntent.data,
                order_id: order.order_code
            }

            return this._res.generateResponse(HttpStatus.OK, `Please approved payment from ${network}`, data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }

    }

    async flutterwaveWebhookOrderComplete(order: EsimOrders, key: string) {

        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            console.log(postOrderPayload);

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

    // PURCHASE ESIM WITH FLUTTER-WAVE MOBILE MONEY END

    // ============================================================================== 

    // PURCHASE ESIM WITH PAWA-PAY MOBILE MONEY START

    async purchaseEsimByPawaPayMobileMoney(body: PawaPayDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, phone_number, currency, network, country_code, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const token = this._general.generateDepositId();

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 4,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: country_code
                },
                token: token,
                affiliateCode,
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
                msg: 'Please approved payment!',
                order_id: order.order_code
            }

            return this._res.generateResponse(HttpStatus.OK, `Please approved your payment`, data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async pawaPayWebhookOrderComplete(order: EsimOrders, key: string) {

        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: true
            }

            console.log(postOrderPayload);

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
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }

    }

    // PURCHASE ESIM WITH PAWA-PAY MOBILE MONEY END

    // ============================================================================== 

    // PURCHASE ESIM WITH PESA-PAL START

    async purchaseEsimByPesaPal(body: PesaPalDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const token = this._general.generateDepositId();

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 5,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                affiliateCode,
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const transactionPayload = {
                id: order.transaction.transaction_token,
                currency: 'USD',
                amount: amount,
                description: `purchase eSim plan`,
                callback_url: `${process.env.REDIRECT_URL}verifypayment?order_no=${order.order_code}&tr_rf=${order.transaction.transaction_token}&method=pesapal&type=ORDER`,
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
                order_id: order.order_code,
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

    async pesapalWebhookOrderComplete(order: EsimOrders, key: string) {

        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            console.log(postOrderPayload);

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
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }

    }

    // PURCHASE ESIM WITH PESA-PAL END

    // ============================================================================== 

    // PURCHASE ESIM WITH FLUTTER-WAVE CARD START

    async purchaseEsimByFwCard(body: FWCardDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode, ...card_details } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const token = this._general.generateTransactionRef(true);

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 2,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                affiliateCode,
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
                order_id: order.order_code,
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
                    status: 'PENDING',
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
                order_id: order.order_code,
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
                    status: 'PENDING',
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
                order_id: order.order_code,
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

    // PURCHASE ESIM WITH FLUTTER-WAVE CARD END


    // ==============================================================================

    // PURCHASE ESIM WITH CUSTOMER WALLET START

    async purchaseEsimByCustomerWallet(body: CustomerwalletDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 3,
                allow_mobile_money: false,
                mobile_money: null,
                token: 'WALLET',
                affiliateCode,
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const walletTransaction = await this._general.performWalletTransaction(order, amount, `purchase ${order.plan.name}`);

            if (!walletTransaction) {
                throw new HttpException("Unable to purchase esim through wallet, please contact support!", HttpStatus.BAD_REQUEST);
            }

            // confirm order on SM
            const confirmOrderPayload = {
                order_id: requestedOrder.data.order_id
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            return this._res.generateResponse(HttpStatus.OK, "Order Completed", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // PURCHASE ESIM WITH CUSTOMER WALLET END

    // ==============================================================================

    // PURCHASE ESIM WITH DPO START

    async purchaseEsimByDPO(body: DPODto, req: Request) {

        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);


            const bookingRef: string = requestedOrder.data.order_id.replace("-", "")
            const payload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'createToken',
                Transaction: {
                    PaymentAmount: amount,
                    PaymentCurrency: 'USD',
                    CompanyRef: bookingRef,
                    RedirectURL: `${process.env.DPO_REDIRECT_URL}?order_no=${requestedOrder.data.order_id}&type=ORDER&method=DPO`,
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
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 6,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                affiliateCode,
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const data = {
                order_id: order.order_code,
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
                    status: 'PENDING',
                    transaction: {
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
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(tr_ref, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Order Completed", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }


    // PURCHASE ESIM WITH DPO END


    // PURCHASE ESIM WITH E-LiPA START

    async purchaseEsimByElipa(body: ElipaDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode, phone_number, country_code } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            const token = this._general.generateDepositId()

            // elipa Integration
            const elipaPayload = {
                order_no: requestedOrder.data.order_id,
                amount: amount,
                customer_email: customer.email,
                phone_number: phone_number,
                country_iso3: country_code,
                token: token,
                type: 'ORDER'
            }

            const elipaResouce = await this._general.getElipaResource(elipaPayload);
            console.log(elipaResouce);

            // store records
            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 7,
                allow_mobile_money: true,
                mobile_money: {
                    phone_number: phone_number,
                    currency: null,
                    network: null,
                    country_code: country_code
                },
                token: token,
                affiliateCode,
            }


            const order = await this.preOrderProcess(preOrderPayload);

            const data = {
                order_id: order.order_code,
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
                    status: 'PENDING',
                    transaction: {
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

            if (!order) {
                throw new HttpException("Invalid Transaction Reference", HttpStatus.BAD_REQUEST);
            }

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            const data = await this.postOrderProcesses(postOrderPayload);

            this._socket.sendOrderCompleteNotification(tr_ref, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your order completed sucessfully",
                    order: data
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Order Completed", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // PURCHASE ESIM WITH E-LiPA END

    // PURCHASE ESIM WITH PAY-STACK START

    async purchaseEsimByPayStack(body: PayStackDto, req: Request) {
        try {

            const { customer_id, plan_id, device_id, coupon_code, affiliateCode } = body;

            const orderData = { customer_id, plan_id, device_id }

            const { customer, plan, device } = await this.validateOrderRequest(orderData);


            // Pre-order implementation 
            // request product on SM

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            const amount = await this.calculatePlanPrice(plan.price, coupon_code);

            // initialize paystack payment
            const convertedAmount = parseInt(await this._general.currencyConvertorV2('NGN', amount))
            const payStackPayload = {
                email: customer.email,
                amount: convertedAmount,
                callback_url: `${process.env.PAYSTACK_REDIRECT_URL}?method=paystack&type=ORDER`,
                metadata: { cancel_action: process.env.REDIRECT_URL }
            }

            const paymentIntent = await this._api.payStackInitializePayment(payStackPayload);

            const token = paymentIntent.data.reference

            const preOrderPayload = {
                requestedOrder: requestedOrder.data,
                coupon_code,
                customer,
                amount,
                plan,
                device,
                order_by: 8,
                allow_mobile_money: false,
                mobile_money: null,
                token: token,
                affiliateCode,
            }

            const order = await this.preOrderProcess(preOrderPayload);

            const data = {
                order_id: order.order_code,
                tr_ref: order.transaction.transaction_token,
                redirect: true,
                redirectUrl: paymentIntent.data.authorization_url,
                payment_ref: paymentIntent.data.reference,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async paystackWebhookOrderComplete(order: EsimOrders, key: string) {

        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved"
                }
            })
            // confirm order on SM
            const confirmOrderPayload = {
                order_id: order.order_code
            };


            const completeOrder = await this._api.completeOrder(confirmOrderPayload);

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "your order about to complete"
                }
            })

            // post order implementation

            const postOrderPayload = {
                sm_order_data: completeOrder.data,
                order,
                adjuctAccountingReport: false
            }

            console.log(postOrderPayload);

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
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "your order cannot be process correctly please contact support"
                }
            })

        }

    }

    // PURCHASE ESIM WITH PAY-STACK END


    // ***GENERAL-FUNCTIONS-WITHIN-SERVICE****

    private async validateOrderRequest(data: any): Promise<OrderData> {

        const { customer_id, plan_id, device_id } = data

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


        const device = (await this._api.getDeviceListByID(device_id)).data;

        if (!device) throw new HttpException("Invalid device selected for order", HttpStatus.BAD_REQUEST);

        const returnElements: OrderData = {
            customer: customer,
            plan: plan,
            device: device
        }

        return returnElements;

    }

   private async calculatePlanPrice(plan_price: string, coupon_code: string, plan_id?: number): Promise<number> {

    // Guard clause for free plan
    if (plan_id === 1) {
        return 0;
    }

    if (!coupon_code) {
        const floatedAmount: string = parseFloat(plan_price).toFixed(2); // here is fixed plan price to 2 decimal points
        const amountConvertedIntoNumber: number = convertor(floatedAmount); // this convertor required amount should be string
        return amountConvertedIntoNumber;
    }

    // coupon validation start
    const coupon = await this._couponRepo.createQueryBuilder('Coupons')
        .where("couponCode = :couponCode AND ( expiry_date IS NULL OR expiry_date > :today) AND deleted_at IS NULL", { couponCode: coupon_code, today: new Date() })
        .getOne();

    if (!coupon || coupon.remainingUse === 0) throw new HttpException("Coupon is expired", HttpStatus.BAD_REQUEST);

    if (coupon.isFixed) {
        const floatedPlanPrice: string = parseFloat(plan_price).toFixed(2); // here is fixed plan price to 2 decimal points
        const PlanPriceConvertedIntoNumber: number = convertor(floatedPlanPrice); // this convertor required amount should be string
        const amountConvertedIntoNumber = PlanPriceConvertedIntoNumber - coupon.discount;
        if (amountConvertedIntoNumber < 0) {
            return 0;
        }
        return amountConvertedIntoNumber;
    } else {
        // calculate discount in %
        const discount = (coupon.discount / 100) * convertor(parseFloat(plan_price).toFixed(2));
        const calculateAmount = convertor(parseFloat(plan_price).toFixed(2)) - discount;
        return convertor(calculateAmount.toFixed(2));
    }
    // coupon validation end
}


    // Pre-Order processes start

    private async preOrderProcess(data: any): Promise<EsimOrders> {
        try {
            const { 
                requestedOrder, 
                coupon_code, 
                amount = 0,  // Default to 0 if amount is null or undefined
                plan, 
                device, 
                order_by, 
                allow_mobile_money, 
                mobile_money, 
                token, 
                customer, 
                affiliateCode 
            } = data;
    
            console.log('I am at amount', amount);
    
            let mobileMoney: any = null;
    
            // Handle mobile money transaction if applicable
            if (allow_mobile_money && mobile_money) {
                mobileMoney = this._MobileMoneyRepo.create({
                    phone_number: mobile_money.phone_number,
                    currency: mobile_money.currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: mobile_money.network,
                    country_code: mobile_money.country_code
                });
                await this._MobileMoneyRepo.save(mobileMoney);
            }
    
            // Create a transaction only if it's not a free plan
            let transaction = null;
            if (amount > 0) {
                transaction = this._transRepo.create({
                    transaction_token: token,
                    amount: amount,
                    status: 'PENDING',
                    note: `roambuddy customer: (${customer.email}) buy ${plan.name}`,
                    mobileMoney: mobileMoney
                });
                await this._transRepo.save(transaction);
            }
    
            // Create a new order
            const newOrder = this._ordersRepo.create({
                status: 'PENDING',
                order_code: requestedOrder.order_id,
                couponCode: coupon_code,
                device_os: device.os,
                device_name: device.name,
                order_by: order_by,
                customer: customer.id,
                plan: plan.id,
                transaction: transaction,
                affiliateCode: affiliateCode
            });
            await this._ordersRepo.save(newOrder);
    
            // Update coupon usage if a coupon code is provided
            if (coupon_code) {
                const coupon = await this._couponRepo.findOne({
                    where: {
                        couponCode: coupon_code
                    }
                });
    
                if (coupon) {
                    await this._couponRepo.createQueryBuilder('Coupons')
                        .update()
                        .set({
                            remainingUse: coupon.remainingUse - 1
                        })
                        .where("couponCode = :coupon_code", { coupon_code: coupon_code })
                        .execute();
    
                    const couponDetails = this._couponDetRepo.create({
                        coupon: coupon,
                        order: newOrder,
                        topup: null
                    });
                    await this._couponDetRepo.save(couponDetails);
                }
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
            });
    
            return order;
    
        } catch (error) {
            console.log(error);
            throw new HttpException("Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    

    // Pre-Order processes end

    // Post-Order processes start

    private async postOrderProcesses(data: any): Promise<any> {
        const { order, sm_order_data, adjuctAccountingReport } = data;
    
        // Update mobileMoney transaction if it exists
        if (order.transaction && order.transaction.mobileMoney) {
            await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.mobileMoney.id })
                .execute();
        }
    
        // Update transaction record if it exists
        if (order.transaction) {
            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.id })
                .execute();
        }
    
        // Update order records
        await this._ordersRepo.createQueryBuilder()
            .update()
            .set({
                status: 'COMPLETED',
                iccid: sm_order_data.iccid,
                qr_code: sm_order_data.qr_code,
                qrcode_url: sm_order_data.qrcode_url,
                apn: sm_order_data.apn,
                data_roaming: sm_order_data.data_roaming
            })
            .where("id = :id", { id: order.id })
            .execute();
    
        const { affiliteUrl, affiliate_dashboard_url } = await this.generateAffiliateUrls(order.affiliateCode, order);
    
        if (adjuctAccountingReport) {
            const accountingReportPayload = {
                iccid: sm_order_data.iccid
            };
            await this.adjustAccountingReport(accountingReportPayload, order);
        }
    
        // Send order mail to customer
        const emailData = {
            to: order.customer.email,
            customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
            order_id: order.order_code,
            order_date: moment(order.created_at).format('MMMM DD YYYY'),
            iccid: sm_order_data.iccid,
            apn: sm_order_data.apn,
            dataRoaming: sm_order_data.data_roaming,
            paymentType: this.getPaymentTpe(order.order_by),
            email: order.customer.email,
            packageData: order.plan.data,
            packageValidity: order.plan.validity,
            planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
            payment: order.transaction ? order.transaction.amount : 0, // Handle free plan case
            os: order.device_os,
            device: order.device_name,
            iosAddress: this.spliteCode(sm_order_data?.qr_code)[1],
            iosURL: this.spliteCode(sm_order_data?.qr_code)[2],
            qrCodeString: sm_order_data.qr_code,
            qr_url: sm_order_data.qrcode_url,
            affiliteUrl: affiliteUrl,
            affiliate_dashboard_url: affiliate_dashboard_url
        };
        console.log('qr code url for emal',emailData.qrCodeString,emailData.qr_url)
        await this._mail.sendOrderEmail(emailData);
    
        const resData = {
            ...sm_order_data,
            customer: order.customer,
            device_os: order.device_os,
            device_name: order.device_name,
            order_date: order.created_at,
            plan: {
                ...order.plan,
                price: order.transaction ? order.transaction.amount : 0 // Handle free plan case
            },
            affiliteUrl: affiliteUrl,
            affiliate_dashboard_url: affiliate_dashboard_url
        };
    
        return resData;
    }
    
    

    // Post-Order processes end

    // Affiliate work start

    private async generateAffiliateUrls(affiliateCode: any, order: EsimOrders): Promise<AffiliateUrls> {

        let retObj: AffiliateUrls = {
            affiliteUrl: '',
            affiliate_dashboard_url: ''
        };
    
        // Check if order.transaction and order.transaction.amount are not null or undefined
        const orderAmount = order.transaction ? parseFloat(order.transaction.amount) : 0; // Convert to number or default to 0
    
        if (affiliateCode && orderAmount > 0) {  // Only process if there's an amount greater than 0
            const leaddynoPayload = {
                key: process.env.PRIVATE_KEY,
                email: order.customer.email,
                purchase_amount: orderAmount,  // Use the numeric amount
                code: affiliateCode
            };
            const leadDynoPurchase = await this._api.leaddynoCreatePurchase(leaddynoPayload);
    
            const affiliatePayload = {
                key: process.env.PRIVATE_KEY,
                email: order.customer.email,
            };
            const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
    
            retObj = {
                affiliteUrl: getAffiliateUrl?.affiliate_url,
                affiliate_dashboard_url: getAffiliateUrl?.affiliate_dashboard_url
            };
        }
    
        return retObj;
    }
    
    
    

    // Affiliate work end

    // Accounrting Report work start


    private async adjustAccountingReport(data: any, order: EsimOrders) {

        // Check if order.transaction and order.transaction.amount are not null or undefined
        const convertTrxAmount = order.transaction ? convertor(order.transaction.amount) : 0;
        const convertCostPrice = convertor(order.plan?.cost_price);
        let convertTrxfeeToDollar = 0;  // Initialize to 0
        let finalAmountAfterDeduction = 0;  // Initialize to 0
    
        if (convertTrxAmount > 0) {  // Only process if there's an amount greater than 0
            if (order.order_by === 1) {
                convertTrxfeeToDollar = await this._general.getStripeTransFees(order.transaction.transaction_token);
                finalAmountAfterDeduction = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
            }
    
            if (order.order_by === 4) {
                const payload = {
                    amount: convertTrxAmount,
                    countryCode: order.transaction?.mobileMoney?.country_code,
                    network: order.transaction?.mobileMoney?.network
                };
                convertTrxfeeToDollar = await this.convertAmount(payload);
                finalAmountAfterDeduction = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
            }
        }
    
        let coupDiscount: any = 0;
        if (order.couponCode) {
            coupDiscount = await this.getCouponDisc(order.couponCode);
        }
    
        // Create report payload
        const createReportPayload: DeepPartial<AccountingReport> = {
            order_date: moment(order.created_at).format('DD MMMM YYYY'),
            order_time: moment(order.created_at).format('HH:mm:ss'),
            order_code: order.order_code,
            transaction_id: order.transaction?.id || null,  // Handle possible null value
            customer_fullname: `${order.customer?.firstname} ${order.customer?.lastname}`,
            customer_email: order.customer?.email,
            iccId: data.iccid,
            plan_name: order.plan?.name,
            data: order.plan?.data,
            validity: order.plan?.validity,
            sale_price_inc_VAT: null,  // Assuming this field is not used in your context
            sale_price_excl_VAT: order.plan?.price ? order.plan.price.toString() : null,  // Convert to string
            coupon_code: order.couponCode || null,
            disc_from_coupon_code: coupDiscount || null,
            amount_paid: convertTrxAmount.toString(),  // Convert to string
            cost_price: convertCostPrice.toString(),  // Convert to string
            payment_mode: this.getPaymentTpe(order.order_by),
            payment_tx_fee: convertTrxfeeToDollar.toString(),  // Convert to string
            profit: finalAmountAfterDeduction.toString()  // Convert to string
        };
    
        await this._accReportRepo.save(createReportPayload);
    }
    
    
    
    
    

    // Accounrting Report work start


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
        console.log(getTrxFeeData);
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

    private spliteCode(qr_code: string) {

        console.log(qr_code);
        const splitedCode = qr_code.split('$');
        console.log(splitedCode);
        return splitedCode;
    }

    private async stripePaymentCharge(data: StripeCharge): Promise<EsimOrders> {

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

}

type StripeCharge = {
    amount: number,
    stripe_token: string,
    plan: Plans
}

type OrderData = {

    customer: Customers,
    plan: Plans
    device: any;
}


type AffiliateUrls = {

    affiliteUrl: string,
    affiliate_dashboard_url: string

}