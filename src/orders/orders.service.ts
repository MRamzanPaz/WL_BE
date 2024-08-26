import { Countries } from './../entities/country.entity';
import { HttpException, HttpStatus, Inject, Injectable, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { ApiService } from 'src/shared/service/api.service';
import { ResponseService } from 'src/shared/service/response.service';
import { Between, In, IsNull, LessThan, Like, Repository } from 'typeorm';
import { ConfirmOrder, ElipaVerifyQuery, MobileMoneyTransDto, MultipleBuyDto, OrderQueryDto, PaginationDto, PurchaseDPODto, PurchaseElipaDto, ReqOrdFwDto, RequestOrderDto, ValidateFWCardDto, authorizeFwCardDto, } from './orders.dto';
import { Request } from 'express';
import { Customers } from 'src/entities/customer.entity';
import { Plans } from 'src/entities/plans.entites';
import { Transactions } from 'src/entities/transactions.entity';
import Stripe from 'stripe';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { MailService } from 'src/mail/mail.service';
import { Devices } from 'src/entities/devices.entity';
import { GeneralService } from 'src/shared/service/general.service';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import * as moment from 'moment';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { SocketGateway } from 'src/socket/socket.gateway';
import * as crypto from 'crypto-js';
import convertor from 'convert-string-to-number';
import { PaymentCacheFW } from 'src/entities/paymentCache.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';

@Injectable()
export class OrdersService {

    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });

    constructor(
        @InjectRepository(EsimOrders)
        private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(TopupOrders)
        private readonly _topupOrdersRepo: Repository<TopupOrders>,
        @InjectRepository(Transactions)
        private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(Plans)
        private readonly _plansRepo: Repository<Plans>,
        @InjectRepository(plans_Counties)
        private readonly _plansCountryRepo: Repository<plans_Counties>,
        @InjectRepository(PawapayTransactions)
        private readonly _pawapayTransactions: Repository<PawapayTransactions>,
        @InjectRepository(AccountingReport)
        private readonly _accReportRepo: Repository<AccountingReport>,
        @InjectRepository(Countries)
        private readonly _countryRepo: Repository<Countries>,
        @InjectRepository(Customers)
        private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(Coupons)
        private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(CouponsDetails)
        private readonly _couponDetRepo: Repository<CouponsDetails>,
        @InjectRepository(Devices)
        private readonly _devicesRepo: Repository<Devices>,
        @InjectRepository(MobileMoneyTransactions)
        private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(PaymentCacheFW)
        private readonly _paymentCacheRepo: Repository<PaymentCacheFW>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        private _mail: MailService,
        private _socket: SocketGateway
    ) { }

    // There are three different type of orders:
    // 1 for credit card
    // 2 for Mobile Money
    // 3 for customer wallet

    async getAllMobileGateways(req: Request) {
        try {

            const { data: { countries } } = await this._api.getActiveConfig();

            const data = [];

            for (const _country of countries) {

                // console.log(_country)

                let temp: any;
                const country = await this._countryRepo.findOne({
                    where: {
                        iso3: _country.country
                    }
                })


                temp = {
                    ...country,
                    networks: _country.correspondents.map((ele: any) => ele.correspondent),
                    currency: _country.correspondents[0].currency
                }

                data.push(temp)
            }

            return data;

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async requestOrder(body: RequestOrderDto, req: Request) {

        try {

            const { customer_id, plan_id, order_by, deviceId, card_cvc, card_month, card_number, card_year, phone_number, currency, network, country, stripe_token } = body;
            let data = {};

            const Plan = await this._plansRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            });
            // console.log(Plan);

            if (!Plan) {

                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Plan id!", null, req);

            }

            const customer = await this._customerRepo.findOne({
                where: {
                    id: customer_id,
                    deleted_at: IsNull()
                }
            });
            // console.log(customer);

            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid customer id!", null, req);
            }

            const findDevice = (await this._api.getDeviceListByID(deviceId)).data;
            // console.log(findDevice);

            if (!findDevice) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Device ID!", null, req);
            }

            let token = null;

            //***** if pay with card *****
            if (order_by == 1) {

                // const createTokenPayload: StripeCreateTokenDto = {
                //     card_cvc: card_cvc,
                //     card_month: card_month,
                //     card_number: card_number,
                //     card_year: card_year
                // };

                // token = await this._general.createStripToken(createTokenPayload);
                token = stripe_token;
                token = token ? `STRIP-${token}` : null;

                if (!token) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid card details!", null, req);
                }
            }

            // if pay with mobile-money (FLUTTER-WAVE)
            let createMobileTransaction = null;
            if (order_by == 2) {

                if (!phone_number || !currency) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please provide correct phone number and curreny!", null, req);
                }

                token = this._general.generateTransactionRef();


                createMobileTransaction = this._MobileMoneyRepo.create({
                    phone_number: phone_number,
                    currency: currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: network
                });
                await this._MobileMoneyRepo.save(createMobileTransaction);

            }

            // **** if pay with wallet ****

            if (order_by == 3) {
                token = 'WALLET';
            }

            // ***** if pay with pawa pay ******

            if (order_by == 4) {
                token = this._general.generateDepositId();

                createMobileTransaction = this._MobileMoneyRepo.create({
                    phone_number: phone_number,
                    currency: currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: network,
                    country_code: country
                });
                await this._MobileMoneyRepo.save(createMobileTransaction);

            }

            // ***** if pay with Pesa-Pal ******
            if (order_by == 5) {
                token = this._general.generateDepositId();
            }

            // ***** if pay with DPO ******
            // if (order_by == 6) {

            //     let payload: any = {}

            //     if (card_cvc && card_month && card_number && card_year) {
            //         payload = {
            //             card_number,
            //             card_cvc,
            //             card_year,
            //             card_month,
            //             type: 'CARD'
            //         }
            //         token = this.hashObject(payload);
            //     }


            // }


            // console.log(token);

            if (!token) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please select valid payment type!", null, req);
            }

            const transactionPayload: any = {
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) buy ${Plan.name}`,
                status: 'PENDING',
                mobileMoney: (order_by == 2 || order_by == 4) ? createMobileTransaction.id : null
            };

            const createTrans: any = this._transRepo.create(transactionPayload);
            await this._transRepo.save(createTrans);

            const payload = {
                plan_id: Plan.package_id,
                email: customer.email,
            };

            // console.log(payload);

            const orderRes = await this._api.requestProductOrder(payload);
            console.log("order", orderRes);

            const { data: { order_id } } = orderRes;

            const orderPayload: EsimOrders | any = {
                customer: customer,
                plan: Plan,
                order_code: order_id,
                status: 'PENDING',
                order_by: order_by,
                device_os: findDevice.os,
                device_name: findDevice.name,
                transaction: createTrans.id
            };

            const createOrder: any = this._ordersRepo.create(orderPayload);
            await this._ordersRepo.save(createOrder);

            data = {
                transaction_id: createTrans.id
            };

            return this.res.generateResponse(HttpStatus.OK, "product requested successfully!", data, req);


        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async requestOrderByFwCard(body: ReqOrdFwDto, req: Request) {
        try {

            const { customer_id, plan_id, deviceId, order_by, coupon_code, affiliateCode, ...card_details } = body;

            const customer = await this._customerRepo.findOne({
                where: {
                    id: customer_id,
                    deleted_at: IsNull()
                }
            })

            if (!customer) {
                this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Customer ID", null, req);
            }

            const plan = await this._plansRepo.findOne({
                where: {
                    id: plan_id,
                    deleted_at: IsNull()
                }
            })

            if (!plan) {
                this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Plan ID", null, req);
            }

            const device = (await this._api.getDeviceListByID(deviceId)).data;

            if (!device) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Device ID!", null, req);
            }

            const token = this._general.generateTransactionRef(true);
            const amount = await this.calculatePlansAmount([plan], coupon_code, req);

            const intentPayload = {
                token,
                amount,
                customer_email: customer.email,
                ...card_details,
            }

            const fwCardIntent = await this._general.createFwCardIntent(intentPayload);

            if (fwCardIntent.status != 'success') {
                throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR)
            }

            const transactionPayload: any = {
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) buy ${plan.name}`,
                status: 'PENDING',
                amount: amount
            };

            const createTrans: any = this._transRepo.create(transactionPayload);
            await this._transRepo.save(createTrans);


            const payload = {
                plan_id: plan.package_id,
                email: customer.email,
            };

            const orderRes = await this._api.requestProductOrder(payload);

            const { data: { order_id } } = orderRes;

            const orderPayload: EsimOrders | any = {
                customer: customer,
                plan: plan,
                order_code: order_id,
                status: 'PENDING',
                order_by: order_by,
                device_os: device.os,
                device_name: device.name,
                transaction: createTrans.id,
                affiliateCode: affiliateCode
            };

            const createOrder: any = this._ordersRepo.create(orderPayload);
            await this._ordersRepo.save(createOrder);

            const paymentCachePayload = {
                order_no: order_id,
                coupon_code,
                tr_ref: token,
                fw_ref: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.flw_ref : null,
                tr_id: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.id : null
            }

            const createCache = this._paymentCacheRepo.create(paymentCachePayload);
            await this._paymentCacheRepo.save(createCache);

            const data = {
                transaction_id: createTrans.id,
                tr_ref: token,
                authorization: fwCardIntent.meta.authorization
            }

            return this.res.generateResponse(HttpStatus.OK, "Please validate your card!", data, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async authorizeFwCard(body: authorizeFwCardDto, req: Request) {
        try {

            const { card_number, card_month, card_year, card_cvc, cardHolder_fullname, authorization, transaction_id } = body;

            const transaction = await this._transRepo.findOne({
                where: {
                    id: transaction_id,
                    status: 'PENDING'
                }
            })

            if (!transaction) {
                throw new HttpException("Invalid Transaction!", HttpStatus.BAD_REQUEST)
            }

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        id: transaction.id
                    }
                },
                relations: {
                    plan: true,
                    customer: true
                }
            })

            if (!order) {
                throw new HttpException("Invalid Transaction!", HttpStatus.BAD_REQUEST)
            }

            const paymentCache = await this._paymentCacheRepo.findOne({
                where: {
                    order_no: order.order_code
                }
            })

            const amount = await this.calculatePlansAmount([order.plan], paymentCache.coupon_code, req)

            const payload = {
                card_number,
                card_cvc,
                card_month,
                card_year,
                token: transaction.transaction_token,
                amount,
                customer_email: order.customer.email,
                cardHolder_fullname,
                authorization: authorization
            }

            const chargeIntiated = await this._general.authorizedFWCard(payload);

            if (chargeIntiated.status != 'success') {
                throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR);
            }

            await this._paymentCacheRepo.createQueryBuilder()
                .update()
                .set({
                    fw_ref: chargeIntiated.data.flw_ref,
                })
                .where("tr_ref = :fw_ref", { fw_ref: transaction.transaction_token })
                .execute();

            const data = {
                transaction_id: transaction.id,
                mode: chargeIntiated.meta.authorization.mode,
                value: chargeIntiated.meta.authorization.mode == 'otp' ? 'otp' : chargeIntiated.meta.authorization.redirect

            }

            return this.res.generateResponse(HttpStatus.OK, "Payment initiated!", data, req);


        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async validateFwCard(body: ValidateFWCardDto, req: Request) {
        try {

            const { transaction_id, otp_code } = body;

            const order = await this._ordersRepo.findOne({
                where: {
                    transaction: {
                        id: transaction_id,
                        status: 'PENDING',
                        deleted_at: IsNull()
                    }
                },
                relations: {
                    customer: true,
                    transaction: true,
                    plan: true
                }
            })


            if (!order) {
                throw new HttpException("Invalid Transaction!", HttpStatus.INTERNAL_SERVER_ERROR)
            }

            const paymentCache = await this._paymentCacheRepo.findOne({
                where: {
                    tr_ref: order.transaction.transaction_token
                }
            });


            const validatePayload = {
                otp: otp_code,
                flw_ref: paymentCache.fw_ref
            }

            const validate = await this._general.validateFWCard(validatePayload);

            if (validate.status != 'success') {
                throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR)
            }

            const data = {
                paymentStatus: 'validated'
            }

            return this.res.generateResponse(HttpStatus.OK, "Payment validated!", data, req);


        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async performMobileMoneTransaction(body: MobileMoneyTransDto, req: Request) {

        try {

            const { transaction_id, couponCode } = body;
            // console.log(transaction_id);

            const order: EsimOrders = await this._ordersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    status: 'PENDING',
                    transaction: {
                        id: transaction_id,
                        status: 'PENDING'
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                }
            });

            if (!order) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid transaction ID !", null, req);
            }

            let amount: any = parseFloat(order.plan.price).toFixed(2);

            let coupon = null;
            if (couponCode) {

                coupon = await this.validateCoupon(couponCode);

                if (!coupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Coupon Code or may be coupon expired!", null, req);
                }

                const { discount, isFixed } = coupon;

                let planPrice = parseFloat(order.plan.price);
                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
                else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
            }



            const data = {
                phone_number: order.transaction.mobileMoney.phone_number,
                amount: amount,
                currency: order.transaction.mobileMoney.currency,
                email: order.customer.email,
                tx_ref: order.transaction.mobileMoney.tr_ref,
                network: order.transaction.mobileMoney.network
            };

            const isPaid = await this._general.createMobileMoneyPaymentIntent(data);

            if (coupon) {
                const payload: CouponsDetails | any = {
                    coupon: coupon,
                    order: order
                };

                const createDetails = this._couponDetRepo.create(payload);
                await this._couponDetRepo.save(createDetails);

                if (coupon.noOfUse) {

                    await this._couponRepo.createQueryBuilder('Coupons')
                        .update()
                        .set({
                            remainingUse: coupon.remainingUse - 1
                        })
                        .where("id = :id", { id: coupon.id })
                        .execute();
                }

                await this._ordersRepo.createQueryBuilder('Orders')
                    .update()
                    .set({
                        couponCode: couponCode,
                    })
                    .where("id = :id", { id: order.id })
                    .execute();
            }



            const mobileIntent = {
                redirect: isPaid.data.redirect,
                redirect_url: isPaid.data.redirectUrl,
                tr_ref: isPaid.data.tr_ref,
                msg: isPaid.data.msg

            };

            return this.res.generateResponse(HttpStatus.OK, mobileIntent.msg, mobileIntent, req);


        } catch (error) {

            return this.res.generateError(error, req);

        }

    }

    async confirmOrder(body: ConfirmOrder, req: Request) {

        try {

            const { couponCode, transaction_id, affiliateCode } = body;
            // console.log(body)

            const order: EsimOrders = await this._ordersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    status: 'PENDING',
                    transaction: {
                        id: transaction_id,
                        status: 'PENDING'
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                }
            });
            // return order

            if (!order) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid transaction ID!", null, req);
            }

            // return order

            let amount: any = parseFloat(order.plan.price).toFixed(2);

            let coupon = null;
            if (couponCode) {

                coupon = await this.validateCoupon(couponCode);

                if (!coupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Coupon Code or may be coupon expired!", null, req);
                }

                const { discount, isFixed } = coupon;

                let planPrice = parseFloat(order.plan.price);
                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
                else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
            }

            const { order_by } = order;

            let paymentStatus: any;

            // if payment by credit card
            if (order_by == 1) {
                // console.log("run")
                paymentStatus = await this.purchaseByCreditCard(order, amount);
                // return paymentStatus

                if (!paymentStatus.code) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, paymentStatus.reason, null, req);
                }
            }
            // console.log("stop")

            // if payment by mobile money
            let paymentIntent;
            if (order_by == 2) {

                const transactionPayload = {
                    phone_number: order.transaction.mobileMoney.phone_number,
                    amount: amount,
                    currency: order.transaction.mobileMoney.currency,
                    email: order.customer.email,
                    tx_ref: order.transaction.mobileMoney.tr_ref,
                    network: order.transaction.mobileMoney.network
                };

                paymentIntent = await this._general.createMobileMoneyPaymentIntent(transactionPayload);
            }

            // // if payment by wallet
            if (order_by == 3) {

                paymentStatus = await this._general.performWalletTransaction(order.customer.id, amount, `purchase ${order.plan.name}`);

                if (!paymentStatus) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "you have low balance in your wallet!", null, req);
                }

            }

            // if payment by pawa-pay
            if (order_by == 4) {
                amount = typeof amount == 'number' ? amount.toString() : amount
                const convertedAmount = await this._general.currencyConverter(order.transaction.mobileMoney.currency, convertor(amount));
                console.log(convertedAmount.toFixed(0));
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

                console.log(transactionPayload);
                const data = await this._api.pawaPayCreateDeposit(transactionPayload);
                console.log(data);

                if (data.status != "ACCEPTED") {
                    return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Transaction Failed!", null, req)
                }

                paymentIntent = {
                    code: 1,
                    data: {
                        tr_ref: data.depositId,
                        redirect: false,
                        redirectUrl: null,
                        msg: 'Please approved payment!'
                    }
                }
            }

            if (order_by == 5) {

                const transactionPayload = {
                    id: order.transaction.transaction_token,
                    currency: 'USD',
                    amount: amount,
                    description: `purchase eSim plan`,
                    callback_url: `${process.env.REDIRECT_URL}/installation?order_no=${order.order_code}`,
                    redirect_mode: "",
                    notification_id: process.env.PESAPAL_IPN,
                    billing_address: {
                        email_address: order.customer.email,
                        first_name: order.customer.firstname,
                        last_name: order.customer.lastname
                    }

                }

                const transactionIntent = await this._api.submitTransaction(transactionPayload);

                paymentIntent = {
                    code: 1,
                    data: {
                        tr_ref: order.transaction.transaction_token,
                        redirect: true,
                        redirectUrl: transactionIntent.redirect_url,
                        msg: 'Please approved payment!'
                    }
                }

            }

            if (coupon) {
                const payload: CouponsDetails | any = {
                    coupon: coupon,
                    order: order
                };

                const createDetails = this._couponDetRepo.create(payload);
                await this._couponDetRepo.save(createDetails);

                if (coupon.noOfUse) {

                    await this._couponRepo.createQueryBuilder('Coupons')
                        .update()
                        .set({
                            remainingUse: coupon.remainingUse - 1
                        })
                        .where("id = :id", { id: coupon.id })
                        .execute();
                }
            }

            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: (order_by == 2 || order_by == 4 || order_by == 5) ? 'PENDING' : 'COMPLETED',
                    amount: `${amount}`,
                })
                .where("id = :id", { id: transaction_id })
                .execute();


            // here we save counpone code only when customer pay with mobile money and PesaPal

            if (order_by == 2 || order_by == 4 || order_by == 5) {

                await this._ordersRepo.createQueryBuilder('Orders')
                    .update()
                    .set({
                        couponCode: couponCode ? couponCode : null,
                    })
                    .where("id = :id", { id: order.id })
                    .execute();

                const data = {
                    ...paymentIntent.data
                }

                return this.res.generateResponse(HttpStatus.OK, "Payment intent created!", data, req);

            }
            // console.log('run')
            const payload = {
                order_id: order.order_code,
                email: process.env.EMAIL
            };
            // return payload
            const completeOrder = await this._api.completeOrder(payload);

            if (!completeOrder?.data) {
                return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error!", null, req)
            }

            const { data, code, message } = completeOrder;

            if (code != 200) {
                return this.res.generateResponse(code, message, data, req);
            }

            await this._ordersRepo.createQueryBuilder('Orders')
                .update()
                .set({
                    apn: data?.apn,
                    qr_code: data?.qr_code,
                    qrcode_url: data?.qrcode_url,
                    data_roaming: data?.data_roaming,
                    iccid: data?.iccid,
                    status: 'COMPLETED',
                    couponCode: couponCode ? couponCode : null,
                })
                .where("id = :id", { id: order.id })
                .execute();

            let emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_id: order.order_code,
                order_date: moment(order.created_at).format('MMMM DD YYYY'),
                iccid: data?.iccid,
                apn: data?.apn,
                dataRoaming: data?.data_roaming,
                paymentType: this.getPaymentTpe(order.order_by),
                email: order.customer.email,
                packageData: order.plan.data,
                packageValidity: order.plan.validity,
                planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
                payment: amount,
                os: order.device_os,
                device: order.device_name,
                iosAddress: this.spliteCode(data?.qr_code)[1],
                iosURL: this.spliteCode(data?.qr_code)[2],
                qrCodeString: data?.qr_code,
                qr_url: data?.qrcode_url,
                affiliteUrl: '',
                affiliate_dashboard_url: ''
            };

            if (affiliateCode) {
                let affiliate_code = affiliateCode ? affiliateCode : "";
                const leaddynoPayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                    purchase_amount: amount,
                    code: affiliate_code
                }
                const leadDynoPurchase = await this._api.leaddynoCreatePurchase(leaddynoPayload);
                let affiliatePayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                }
                const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
                console.log(leadDynoPurchase);
                console.log(getAffiliateUrl);
                emailData = {
                    ...emailData,
                    affiliteUrl: getAffiliateUrl?.affiliate_url,
                    affiliate_dashboard_url: getAffiliateUrl?.affiliate_dashboard_url
                }
                console.log("email data: ", emailData)
            }


            await this._mail.sendOrderEmail(emailData);

            // if pawapay order by 4 / credit card order by 1 payment then added to accounting report
            if (order.order_by == 1) {
                let trxAmount = emailData?.payment;
                // let costPrice = typeof order.plan?.cost_price == 'number' ? (order.plan?.cost_price.toString() : order.plan?.cost_price
                const convertTrxAmount: any = parseFloat(trxAmount).toFixed(2);
                const convertCostPrice: any = parseFloat(order.plan?.cost_price).toFixed(2);
                const convertTrxfeeToDollar: any = (convertTrxAmount * 0.029) + 0.33;
                // console.log(convertTrxfeeToDollar, typeof convertTrxfeeToDollar);
                const finalAmountAfterDeduction: any = parseFloat(convertTrxAmount) - (parseFloat(convertCostPrice) + convertTrxfeeToDollar);
                // console.log(typeof convertTrxAmount, typeof convertCostPrice, typeof finalAmountAfterDeduction);
                let coupDiscount: any = 0;
                if (order.couponCode) {
                    coupDiscount = await this.getCouponDisc(order.couponCode)
                }

                const temp: any = {
                    order_date: moment(order.created_at).format('DD MMMM YYYY'),
                    order_time: moment(order.created_at).format('HH:MM:SS'),
                    order_code: order.order_code,
                    transaction_id: order.transaction.id,
                    customer_fullname: `${order.customer?.firstname} ${order.customer?.lastname}`,
                    customer_email: order.customer?.email,
                    iccId: data.iccid,
                    plan_name: order.plan?.name,
                    data: order.plan?.data,
                    validity: order?.plan.validity,
                    sale_price_inc_VAT: null,
                    sale_price_excl_VAT: order.plan?.price,
                    coupon_code: order.couponCode,
                    disc_from_coupon_code: coupDiscount,
                    amount_paid: convertTrxAmount,
                    cost_price: convertCostPrice,
                    payment_mode: this.getPaymentTpe(order.order_by),
                    payment_tx_fee: convertTrxfeeToDollar.toFixed(3),
                    profit: finalAmountAfterDeduction.toFixed(3)
                };

                const createreport = this._accReportRepo.create(temp);
                await this._accReportRepo.save(createreport);
            }

            const resData = {
                ...data,
                customer: order.customer,
                device_os: order.device_os,
                device_name: order.device_name,
                order_date: order.created_at,
                plan: {
                    ...order.plan,
                    price: amount

                },
                affiliteUrl: emailData.affiliteUrl,
                affiliate_dashboard_url: emailData.affiliate_dashboard_url
            };

            return this.res.generateResponse(HttpStatus.OK, `${order.order_code} order has been completed .`, resData, req);


        } catch (error) {
            console.log(error);
            return this.res.generateError(error, req);
        }
    }

    getPaymentTpe(order_by: number) {
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

    spliteCode(qr_code: string) {

        // console.log(qr_code);
        let splitedCode = qr_code.split('$');
        // console.log(splitedCode);
        return splitedCode;
    }

    async validateCoupon(code: string) {

        let ret: any = false;
        const coupon = await this._couponRepo.createQueryBuilder('Coupons')
            .where("couponCode = :couponCode AND ( expiry_date IS NULL OR expiry_date > :today) AND deleted_at IS NULL", { couponCode: code, today: new Date() })
            .getOne();

        ret = coupon;
        if (!coupon) {
            ret = false;
        } else {

            if (coupon.noOfUse) {
                const details = await this._couponDetRepo.find({
                    where: {
                        coupon: {
                            id: coupon.id
                        }
                    }
                });

                if (details.length >= coupon.noOfUse) {
                    ret = false;
                }
            }

        }


        return ret;

    }

    async purchaseByCreditCard(order: EsimOrders, amount: any) {
        let ret: any;
        let _token = order.transaction.transaction_token.split('-')[1];
        // console.log(_token);
        let _amount: any = amount * 100;
        _amount = _amount.toFixed(0);
        // console.log(_amount);
        try {
            const charge = await this.STRIPE.charges.create({
                amount: _amount,
                currency: 'usd',
                source: _token,
                description: `purchase ${order.plan.name}`
            });

            ret = {
                code: 1,
                message: 'Transaction Successful!'
            };

            // console.log(ret)

            return ret;

        } catch (error) {
            // console.log(error);
            ret = {
                code: 0,
                message: 'Transaction unSuccessful!',
                reason: error.raw.code
            };

            return ret;

        }
    }



    async getAllOrders(req: Request) {
        try {

            const allOrders = await this._ordersRepo.find({
                where: {
                    deleted_at: IsNull()
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                },
                select: {
                    customer: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        email: true
                    }
                }
            });

            return this.res.generateResponse(HttpStatus.OK, "Orders List", allOrders, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllOrdersByPagination(params: PaginationDto, req: Request) {
        try {
            const { page, pageSize, searchStr } = params;
            const allOrders = await this._ordersRepo.find({
                where: [{
                    deleted_at: IsNull(),
                    order_code: Like(`%${searchStr}%`)
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        firstname: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        lastname: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        email: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    plan: {
                        name: Like(`%${searchStr}%`)
                    }
                }
                ],
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                },
                select: {
                    customer: {
                        id: true,
                        firstname: true,
                        lastname: true,
                        email: true
                    }
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            });

            const totalCount = await this._ordersRepo.count({
                where: [{
                    deleted_at: IsNull(),
                    order_code: Like(`%${searchStr}%`)
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        firstname: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        lastname: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    customer: {
                        email: Like(`%${searchStr}%`)
                    }
                },
                {
                    deleted_at: IsNull(),
                    plan: {
                        name: Like(`%${searchStr}%`)
                    }
                }
                ]
            });

            const data = {
                list: allOrders,
                total_count: totalCount,
                page,
                pageSize
            };

            return this.res.generateResponse(HttpStatus.OK, "Orders List", data, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllOrdersByCustomerId(customer_id: string, req: Request) {
        try {

            const orders = await this._ordersRepo.find({
                where: {
                    deleted_at: IsNull(),
                    customer: {
                        id: parseInt(customer_id)
                    }
                },
                relations: {
                    plan: true,
                    transaction: true
                }
            });

            return this.res.generateResponse(HttpStatus.OK, "Customer order list", orders, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllRechargeOrders(req: Request) {
        try {

            const allOrders = await this._topupOrdersRepo.find({
                where: {
                    deleted_at: IsNull(),
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                }
            });

            return this.res.generateResponse(HttpStatus.OK, "topup orders list", allOrders, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async adjustOrderNumberInTopups(req: Request) {
        try {

            const { code, data } = await this._api.getAllTopupOrders();

            for (let index = 0; index < data.length; index++) {
                const order = data[index];

                let end_date = moment(order.created_at).format('YYYY-MM-DD HH:mm:ss');
                let start_date = moment(order.created_at).subtract(1, 'minute').format('YYYY-MM-DD HH:mm:ss');

                const topupArr = await this._topupOrdersRepo.query(
                    'SELECT * FROM topup_orders AS t\n'
                    +
                    `WHERE t.iccid = '${order.iccid}' AND t.created_at BETWEEN '${start_date}' AND '${end_date}'`
                )

                if (topupArr.length) {
                    const topup = await this._topupOrdersRepo.createQueryBuilder()
                        .update()
                        .set({
                            order_no: order.order_no,
                        })
                        .where("id = :id", { id: topupArr[0].id })
                        .execute()
                }
            }

            return this.res.generateResponse(HttpStatus.OK, "Orders adjusted", [], req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllRechargeOrdersByPagination(params: PaginationDto, req: Request) {

        try {
            const { page, pageSize, searchStr } = params;
            const allOrders = await this._topupOrdersRepo.find({
                where: {
                    deleted_at: IsNull(),
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            });

            const totalCount = await this._topupOrdersRepo.count({
                where: {
                    deleted_at: IsNull()
                }
            });
            console.log(totalCount)

            const data = {
                list: allOrders,
                total_count: totalCount,
                page,
                pageSize
            };

            return this.res.generateResponse(HttpStatus.OK, "Orders List", data, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async getAllRechargeOrdersByCustomerId(customer_id: string, req: Request) {

        try {

            const allOrders = await this._topupOrdersRepo.find({
                where: {
                    deleted_at: IsNull(),
                    customer: {
                        id: parseInt(customer_id)
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: true
                }
            });

            return this.res.generateResponse(HttpStatus.OK, "topup orders list", allOrders, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async getMobilePaymentStatus(transaction_id: string, req: Request) {

        try {
            const order = await this._ordersRepo.findOne({
                where: {
                    status: 'PENDING',
                    transaction: {
                        id: parseInt(transaction_id),
                        status: 'PENDING',
                    }
                },
                relations: {
                    plan: true,
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    }
                }
            });

            console.log("ccccccccccccccccccccccccccccccccccccccccccccccc")
            console.log(order)

            if (!order) {

                // throw new HttpException("Invalid transaction id",HttpStatus.BAD_REQUEST)
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid transaction id", null, req);

            }

            const isCardPayment = order.transaction.transaction_token.includes('FW-CARD');

            if (!isCardPayment) {
                if (order.transaction.mobileMoney?.status == 'PENDING') {
                    // throw new HttpException("Please approved payment first!",HttpStatus.BAD_REQUEST)
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please approved payment first!", null, req);
                }

                if (order.transaction.mobileMoney?.status == 'FAILED') {
                    // throw new HttpException("we are sorry your payment has been rejected!",HttpStatus.BAD_REQUEST)
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "we are sorry your payment has been rejected!", null, req);
                }
            } else {
                if (order.transaction.status == 'FAILED') {
                    // throw new HttpException("we are sorry your payment has been rejected!",HttpStatus.BAD_REQUEST)
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "we are sorry your payment has been rejected!", null, req);
                }
            }

            if (isCardPayment) {

                const paymentCache = await this._paymentCacheRepo.findOne({
                    where: {
                        tr_ref: order.transaction.transaction_token
                    }
                })

                if (paymentCache.coupon_code) {
                    const coupon = await this._couponRepo.findOne({
                        where: {
                            couponCode: paymentCache.coupon_code
                        },
                        relations: {
                            details: true
                        }
                    })
                    if (coupon) {
                        const payload: CouponsDetails | any = {
                            coupon: coupon,
                            order: order
                        };

                        const createDetails = this._couponDetRepo.create(payload);
                        await this._couponDetRepo.save(createDetails);

                        if (coupon.noOfUse) {

                            await this._couponRepo.createQueryBuilder('Coupons')
                                .update()
                                .set({
                                    remainingUse: coupon.remainingUse - 1
                                })
                                .where("id = :id", { id: coupon.id })
                                .execute();
                        }

                        await this._ordersRepo.createQueryBuilder('Orders')
                            .update()
                            .set({
                                couponCode: coupon.couponCode
                            })
                            .where("id = :id", { id: order.id })
                            .execute();
                    }
                }


            }

            const payload = {
                order_id: order.order_code
            };
            const completeOrder = await this._api.completeOrder(payload);

            const { data, code, message } = completeOrder;
            console.log(data)

            if (code != 200) {
                return this.res.generateResponse(code, message, data, req);
            }

            // save transaction status
            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: parseInt(transaction_id) })
                .execute();

            // save order details
            await this._ordersRepo.createQueryBuilder('Orders')
                .update()
                .set({
                    apn: data?.apn,
                    qr_code: data?.qr_code,
                    qrcode_url: data?.qrcode_url,
                    data_roaming: data?.data_roaming,
                    iccid: data?.iccid,
                    status: 'COMPLETED',
                })
                .where("id = :id", { id: order.id })
                .execute();


            // set email data
            let emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_id: order.order_code,
                order_date: moment(order.created_at).format('MMMM Do YYYY'),
                iccid: data?.iccid,
                apn: data?.apn,
                dataRoaming: data?.data_roaming,
                paymentType: this.getPaymentTpe(order.order_by),
                email: order.customer.email,
                packageData: order.plan.data,
                packageValidity: order.plan.validity,
                planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
                payment: order.transaction.amount,
                os: order.device_os,
                device: order.device_name,
                iosAddress: this.spliteCode(data?.qr_code)[1],
                iosURL: this.spliteCode(data?.qr_code)[2],
                qrCodeString: data?.qr_code,
                qr_url: data?.qrcode_url,
                affiliteUrl: '',
                affiliate_dashboard_url: ''
            };

            // console.log("email data ===>", emailData)

            const affiliateCode = order.affiliateCode
            if (affiliateCode) {
                let affiliate_code = affiliateCode ? affiliateCode : "";
                const leaddynoPayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                    purchase_amount: order.transaction.amount,
                    code: affiliate_code
                }
                const leadDynoPurchase = await this._api.leaddynoCreatePurchase(leaddynoPayload);
                let affiliatePayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                }
                const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
                console.log(leadDynoPurchase);
                console.log(getAffiliateUrl);
                emailData = {
                    ...emailData,
                    affiliteUrl: getAffiliateUrl?.affiliate_url,
                    affiliate_dashboard_url: getAffiliateUrl?.affiliate_dashboard_url
                }
                console.log("email data: ", emailData)
            }

            // send email to customer
            await this._mail.sendOrderEmail(emailData);

            if (order.order_by == 4) {
                const payload = {
                    amount: parseFloat(emailData?.payment),
                    countryCode: order.transaction.mobileMoney.country_code,
                    network: order.transaction.mobileMoney.network
                }
                const convertTrxfeeToDollar = await this.convertAmount(payload);
                const convertTrxAmount: any = convertor(parseFloat(convertor(emailData?.payment)).toFixed(2));
                const convertCostPrice: any = convertor(parseFloat(convertor(order.plan?.cost_price)).toFixed(2));
                // console.log(convertTrxAmount, convertCostPrice, convertTrxfeeToDollar);
                const finalAmountAfterDeduction: any = parseFloat(convertTrxAmount) - (parseFloat(convertCostPrice) + convertTrxfeeToDollar);

                let coupDiscount: any = 0;
                if (order.couponCode) {
                    coupDiscount = await this.getCouponDisc(order.couponCode)
                }

                const temp: any = {
                    order_date: moment(order.created_at).format('DD MMMM YYYY'),
                    order_time: moment(order.created_at).format('HH:MM:SS'),
                    order_code: order.order_code,
                    transaction_id: order.transaction.id,
                    customer_fullname: `${order.customer?.firstname} ${order.customer?.lastname}`,
                    customer_email: order.customer?.email,
                    iccId: data.iccid,
                    plan_name: order.plan?.name,
                    data: order.plan?.data,
                    validity: order?.plan.validity,
                    sale_price_inc_VAT: null,
                    sale_price_excl_VAT: order.plan?.price,
                    coupon_code: order.couponCode,
                    disc_from_coupon_code: coupDiscount,
                    amount_paid: convertTrxAmount,
                    cost_price: convertCostPrice,
                    payment_mode: this.getPaymentTpe(order.order_by),
                    payment_tx_fee: convertTrxfeeToDollar.toFixed(3),
                    profit: finalAmountAfterDeduction.toFixed(3)
                };

                const createreport = this._accReportRepo.create(temp);
                await this._accReportRepo.save(createreport);
            }

            // set response data
            const resData = {
                ...data,
                customer: order.customer,
                device_os: order.device_os,
                device_name: order.device_name,
                order_date: order.created_at,
                plan: {
                    ...order.plan,
                    price: order.transaction.amount,

                }
            };
            this._socket.boardCastMsg('order-status', { topic: 'order-completed', trans_id: parseInt(transaction_id), message: "Your order is complete now!", data: resData, success: true })
            return this.res.generateResponse(HttpStatus.OK, `${order.order_code} order has been completed .`, resData, req);

        } catch (error) {
            console.log(error);
            // return this.res.generateError(error, req);
        }

    }

    async getOrderByOrderIdAndCustomerId(query: OrderQueryDto, req: Request) {
        try {

            const { order_id, customer_id, merchant_ref } = query;

            console.log(query);

            const order = await this._ordersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    status: 'COMPLETED',
                    order_code: order_id,
                    customer: {
                        id: parseInt(customer_id),
                    },
                    transaction: {
                        transaction_token: merchant_ref
                    }
                },
                relations: {
                    plan: true,
                    customer: true
                }
            })

            let data: any;
            if (order) {

                data = {
                    order_id: order.order_code,
                    order_status: order.status,
                    qr_code: order.qr_code,
                    qrcode_url: order.qrcode_url,
                    apn: order.apn,
                    data_roaming: order.data_roaming,
                    iccid: order.iccid,
                    plan: order.plan,
                    customer: order.customer,
                    device_os: order.device_os,
                    device_name: order.device_name,
                    order_date: order.created_at
                }

            }

            return this.res.generateResponse(HttpStatus.OK, "Order details", data, req);


        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    hashObject(obj) {
        // Convert the object to a JSON string
        const jsonString = JSON.stringify(obj);

        // here we use dpo company token as a secret key for hashing customer payment details
        const cipherText = crypto.AES.encrypt(jsonString, process.env.DPO_COMPANY_TOKEN).toString();

        return cipherText

    }

    // Function to dehash an object
    dehashObject(cipherText) {

        try {
            const bytes = crypto.AES.decrypt(cipherText, process.env.DPO_COMPANY_TOKEN);
            const originalText = bytes.toString(crypto.enc.Utf8);
            const orignalObj = JSON.parse(originalText);
            return orignalObj
        } catch (error) {
            throw new HttpException('Invalid transaction ID', HttpStatus.BAD_REQUEST)
        }

    }

    async buyMultipleEsims(body: MultipleBuyDto, req: Request) {
        try {

            const { customer_id, plan_ids, order_by, couponCode, ...paymentDetails } = body;

            // const Plans = await this._plansRepo.find({
            //     where: {
            //         deleted_at: IsNull(),
            //         id: In(plan_ids)
            //     }
            // });

            const Plans: Plans[] = [];

            for (const planId of plan_ids) {

                const plan = await this._plansRepo.findOne({
                    where: {
                        deleted_at: IsNull(),
                        id: planId
                    }
                })

                Plans.push(plan);

            }

            // console.log(Plans);

            if (!Plans.length || plan_ids.length != Plans.length) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid Plan ids!", null, req);
            }

            const customer = await this._customerRepo.findOne({
                where: {
                    id: customer_id,
                    deleted_at: IsNull()
                }
            });

            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid customer id!", null, req);
            }

            // Request order START

            const transactionToken = await this.createTransationToken(order_by, paymentDetails, req);

            // console.log(transactionToken);

            const Requestedorders: any[] = []

            for (const plan of Plans) {
                Requestedorders.push(await this.createOrderRequestForEachPlan(plan, customer, order_by, paymentDetails, transactionToken, couponCode, req));
            }

            // console.log(Requestedorders);

            // // Request order END

            // // ========================================================================================================================================

            // // Complete order Start


            const amount = await this.calculatePlansAmount(Plans, couponCode, req)

            const TransactionIntent = await this.chargeTransaction(amount, order_by, transactionToken, paymentDetails, customer, req);

            const { redirect, webhookDepend } = TransactionIntent;



            if (!redirect && !webhookDepend) {

                const completedOrdersData: any[] = []

                for (const order of Requestedorders) {

                    completedOrdersData.push(await this.completedAllOrdersRequest(order, amount, req))

                }

                return this.res.generateResponse(HttpStatus.OK, `orders has been completed .`, completedOrdersData, req);

            } else {

                return this.res.generateResponse(HttpStatus.OK, "we are waiting for your payment approval", TransactionIntent, req)

            }


            // Complete order End


        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async createOrderRequestForEachPlan(plan: Plans, customer: Customers, order_by: number, paymentDetails: any, transactionToken: string, couponCode, req: Request) {

        try {

            const { package_id } = plan;

            const requestOrderBody = {
                plan_id: package_id
            }

            const { data: { order_id } } = await this._api.requestProductOrder(requestOrderBody);

            const transaction = await this.saveTransaction(transactionToken, order_by, paymentDetails, plan, customer);


            const orderPayload: EsimOrders | any = {
                customer: customer,
                plan: plan,
                order_code: order_id,
                status: 'PENDING',
                order_by: order_by,
                transaction: transaction.id,
                couponCode: couponCode
            };

            const createOrder: any = this._ordersRepo.create(orderPayload);
            await this._ordersRepo.save(createOrder);

            return order_id;


        } catch (error) {
            this.res.generateError(error, req);
        }

    }

    async createTransationToken(order_By: number, paymentDetails: any, req: Request) {

        try {

            let token: any = null;

            switch (order_By) {
                case 1: // stripe token
                    // create stripe token
                    token = this.createStripeToken(paymentDetails, req)
                    break;
                case 2: // flutterwave token
                    token = this.createFlutterwaveToken(req)
                    break
                default:
                    break;

            }

            if (!token) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid payment option!", null, req);
            }
            return token

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    createStripeToken(paymentDetails: any, req: Request) {

        const { stripe_token } = paymentDetails;

        if (!stripe_token) {
            return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid cards details", null, req)
        }

        return `STRIP-${stripe_token}`;

    }

    createFlutterwaveToken(req: Request) {
        try {

            let token = this._general.generateTransactionRef();
            return token

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async saveTransaction(transactionToken: any, order_by: number, paymentDetails: any, plan: Plans, customer: Customers) {


        const { phone_number, currency, network } = paymentDetails;

        let createMobileTransaction = null;

        if (order_by == 2 || order_by == 4) {
            createMobileTransaction = this._MobileMoneyRepo.create({
                phone_number: phone_number,
                currency: currency,
                tr_ref: transactionToken,
                status: 'PENDING',
                network: network
            });
            await this._MobileMoneyRepo.save(createMobileTransaction);
        }




        const transactionPayload: any = {
            transaction_token: transactionToken,
            note: `${process.env.API_NAME} customer: (${customer.email}) buy ${plan.name}`,
            status: 'PENDING',
            mobileMoney: (order_by == 2 || order_by == 4) ? createMobileTransaction.id : null
        };

        const createTrans: any = this._transRepo.create(transactionPayload);
        await this._transRepo.save(createTrans);

        const transaction = await this._transRepo.findOne({
            where: {
                deleted_at: IsNull(),
                id: createTrans.id
            }
        })

        return transaction;

    }

    async chargeTransaction(amount: any, order_by: number, transactionToken: string, paymentDetails: any, customer: Customers, req: Request) {

        try {

            let chargeIntent: any = null;

            switch (order_by) {
                case 1:
                    chargeIntent = await this.purchaseMultipleEsimsByCreditCard(transactionToken, amount, req);
                    break;
                case 2:
                    chargeIntent = await this.purchaseMultipleEsimsByFLutterwave(transactionToken, paymentDetails, amount, customer, req);
                    break;
                default:
                    break;
            }

            if (!chargeIntent) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid payment option selected", null, req)
            }

            return chargeIntent

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async calculatePlansAmount(plans: Plans[], couponCode: string, req: Request) {

        try {

            let amount: any = 0;

            for (const plan of plans) {
                amount = amount + convertor(parseFloat(plan.price).toFixed(2))
            }

            let coupon = null;
            if (couponCode) {

                coupon = await this.validateCoupon(couponCode);

                if (!coupon) {
                    // throw new HttpException("Invalid coupon code!", HttpStatus.INTERNAL_SERVER_ERROR)
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code!", null, req)
                }

                const { discount, isFixed } = coupon;

                let plansPrice = parseFloat(amount);
                if (!isFixed) {
                    let discountAmount = plansPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                    amount = amount.toFixed(2)
                }
                else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                    amount = amount.toFixed(2)
                }
            }

            amount = typeof amount == 'string' ? parseFloat(amount) : amount;

            return amount;

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async purchaseMultipleEsimsByCreditCard(transactionToken: string, amount: any, req: Request) {
        let ret: any;
        console.log(amount);
        let _token = transactionToken.split('-')[1];
        console.log(_token);
        let _amount: any = amount * 100;
        _amount = _amount.toFixed(0);
        console.log(_amount);
        try {
            const charge = await this.STRIPE.charges.create({
                amount: _amount,
                currency: 'usd',
                source: _token,
                description: `purchase esims`
            });

            ret = {
                code: 1,
                message: 'Transaction Successful!',
                redirect: false,
                webhookDepend: false
            };

            return ret;

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async purchaseMultipleEsimsByFLutterwave(transactionToken: string, paymentDetails: any, amount: any, customer: Customers, req: Request) {
        try {

            const { phone_number, currency, network } = paymentDetails;

            const transactionPayload = {
                phone_number: phone_number,
                amount: amount,
                currency: currency,
                email: customer.email,
                tx_ref: transactionToken,
                network: network
            };

            const fwResponse = await this._general.createMobileMoneyPaymentIntent(transactionPayload);

            const paymentIntent = {
                tr_ref: fwResponse.data.tr_ref,
                message: fwResponse.data.msg,
                redirect: fwResponse.data.redirect,
                redirectUrl: fwResponse.data.redirectUrl,
                webhookDepend: true
            };

            return paymentIntent;

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async completedAllOrdersRequest(order_no: string, amount: any, req: Request) {
        try {

            const order = await this._ordersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    order_code: order_no,
                    status: 'PENDING'
                },
                relations: {
                    customer: true,
                    transaction: {
                        mobileMoney: true
                    },
                    plan: true
                }
            });

            if (!order) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Internal server error", null, req)
            }

            const completeOrderBody = {
                order_id: order_no
            }

            const completeOrder = await this._api.completeOrder(completeOrderBody);

            if (!completeOrder?.data) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Internal server error", null, req)
            }

            const { data, code, message } = completeOrder;

            if (code != 200) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Internal server error", null, req)
            }

            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED',
                    amount: amount
                })
                .where("id = :id", { id: order.transaction.id })
                .execute()



            if (order.transaction.mobileMoney) {
                // console.log("have mobile money trans");
                await this._MobileMoneyRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'COMPLETED',
                    })
                    .where("id = :id", { id: order.transaction.mobileMoney.id })
                    .execute()

            }

            await this._ordersRepo.createQueryBuilder('Orders')
                .update()
                .set({
                    apn: data?.apn,
                    qr_code: data?.qr_code,
                    qrcode_url: data?.qrcode_url,
                    data_roaming: data?.data_roaming,
                    iccid: data?.iccid,
                    status: 'COMPLETED',
                })
                .where("order_code = :order_code", { order_code: order_no })
                .execute();


            const emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_id: order.order_code,
                order_date: moment(order.created_at).format('MMMM Do YYYY'),
                iccid: data?.iccid,
                apn: data?.apn,
                dataRoaming: data?.data_roaming,
                paymentType: this.getPaymentTpe(order.order_by),
                email: order.customer.email,
                packageData: order.plan.data,
                packageValidity: order.plan.validity,
                planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
                payment: await this.calculatePlansAmount([order.plan], order.couponCode, req),
                os: "order.device_os",
                device: "order.device_name",
                iosAddress: this.spliteCode(data?.qr_code)[1],
                iosURL: this.spliteCode(data?.qr_code)[2],
                qrCodeString: data?.qr_code,
                qr_url: data?.qrcode_url
            };


            await this._mail.sendOrderEmail(emailData);

            const resData = {
                ...data,
                customer: order.customer,
                device_os: order.device_os,
                device_name: order.device_name,
                order_date: order.created_at,
                plan: {
                    ...order.plan,
                    price: await this.calculatePlansAmount([order.plan], order.couponCode, req),

                }
            };

            console.log(order.order_code, "Completed");

            return resData;


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async purchaseEsimByDPO(body: PurchaseDPODto, req: Request) {
        try {

            const { customer_id, plan_id, deviceId, coupon_code, affiliateCode } = body;

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customer_id
                }
            })

            if (!customer) {
                throw new HttpException("Invalid Customer ID!", HttpStatus.BAD_REQUEST)
            }

            const plan = await this._plansRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!plan) {
                throw new HttpException("Invalid Plan ID!", HttpStatus.BAD_REQUEST)
            }

            const device = (await this._api.getDeviceListByID(deviceId)).data;

            if (!device) {
                throw new HttpException("Invalid Device ID!", HttpStatus.BAD_REQUEST)
            }

            const requestEsimPayload = {
                plan_id: plan.package_id
            }
            const { code, data } = await this._api.requestProductOrder(requestEsimPayload);

            if (code != 200) throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR);

            const amount = await this.calculatePlansAmount([plan], coupon_code, req);

            const bookingRef: string = data.order_id.replace("-", "")
            const payload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'createToken',
                Transaction: {
                    PaymentAmount: amount,
                    PaymentCurrency: 'USD',
                    CompanyRef: bookingRef,
                    RedirectURL: `${process.env.DPO_REDIRECT_URL}?order_no=${data.order_id}&type=ORDER`,
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
            
            const tokenResponse: any = await this._api.dpoCreateToken(payload);

            let token = `DPO_${tokenResponse.API3G.TransToken._text}`;


            // set payment-cache

            const paymentCache = this._paymentCacheRepo.create({
                coupon_code: coupon_code,
                tr_ref: token
            })
            await this._paymentCacheRepo.save(paymentCache);

            // create request order record start

            const transaction = this._transRepo.create({
                transaction_token: token,
                note: `roambuddy customer: (${customer.email}) buy Plan for Europe`,
                status: 'PENDING',
                amount: amount
            })

            await this._transRepo.save(transaction);

            const setRecord = this._ordersRepo.create({
                status: "PENDING",
                order_code: data.order_id,
                order_by: 6,
                couponCode: coupon_code,
                device_os: device.os,
                device_name: device.name,
                customer: customer,
                plan: plan,
                transaction: transaction,
                affiliateCode: affiliateCode
            })
            await this._ordersRepo.save(setRecord);

            const resData = {
                token: token,
                transaction_id: transaction.id,
                order_no: data.order_id,
                redirect: true,
                redirect_url: `${process.env.DPO_PAYMENT_URL}${tokenResponse.API3G.TransToken._text}`
            }

            return this.res.generateResponse(HttpStatus.OK, "Order requested successfully", resData, req);


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async verifyAndGetOrderDetails(order_no: string, req: Request) {
        try {
            console.log(order_no);
            const order = await this._ordersRepo.findOne({
                where: {
                    order_code: order_no
                },
                relations: {
                    plan: true,
                    transaction: {
                        mobileMoney: true
                    },
                    customer: true
                }
            })

            if (!order || order.status == 'COMPLETED') throw new HttpException("In-valid Order no provided!", HttpStatus.BAD_REQUEST);

            const transaction_token: string = order.transaction.transaction_token;

            // return order;

            const pureToken = transaction_token.split('_')[1]
            const mode = transaction_token.split('_')[2];

            const dpoVerifypayload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'verifyToken',
                TransactionToken: process.env.DPO_ACTIVE_MODE == 'TEST' ? process.env.DPO_TEST_TOKEN : pureToken
            }

            const verifyTokenResponse: any = await this._api.dpoVerifyToken(dpoVerifypayload);

            if (verifyTokenResponse.API3G.Result._text != '000') {

                await this._transRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'FAILED'
                    })
                    .where("id = :id", { id: order.transaction.id })
                    .execute();

                if (mode == 'MNO') {

                    await this._MobileMoneyRepo.createQueryBuilder()
                        .update()
                        .set({
                            status: 'FAILED'
                        })
                        .where("id = :id", { id: order.transaction.mobileMoney.id })
                        .execute();

                }
                this._socket.boardCastMsg('order-status', { topic: 'order-completed', trans_id: order.transaction.id, message: "Your transaction has been failed!", data: null, success: false })
                throw new HttpException("In-valid Order no provided!", HttpStatus.BAD_REQUEST);

            }

            this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.transaction.id, message: "We have received your payment!", success: true })

            const smConfirmOrder = {
                order_id: order.order_code
            }

            const confirmOrderResponse = await this._api.completeOrder(smConfirmOrder);

            const { data, code, message } = confirmOrderResponse;

            if (code != 200) {
                return this.res.generateResponse(code, message, data, req);
            }

            await this._ordersRepo.createQueryBuilder('Orders')
                .update()
                .set({
                    apn: data?.apn,
                    qr_code: data?.qr_code,
                    qrcode_url: data?.qrcode_url,
                    data_roaming: data?.data_roaming,
                    iccid: data?.iccid,
                    status: 'COMPLETED',
                })
                .where("id = :id", { id: order.id })
                .execute();


            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.id })
                .execute();

            if (mode == 'MNO') {

                await this._MobileMoneyRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'COMPLETED'
                    })
                    .where("id = :id", { id: order.transaction.mobileMoney.id })
                    .execute();

            }

            let emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_id: order.order_code,
                order_date: moment(order.created_at).format('MMMM Do YYYY'),
                iccid: data?.iccid,
                apn: data?.apn,
                dataRoaming: data?.data_roaming,
                paymentType: this.getPaymentTpe(order.order_by),
                email: order.customer.email,
                packageData: order.plan.data,
                packageValidity: order.plan.validity,
                planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
                payment: order.transaction.amount,
                os: order.device_os,
                device: order.device_name,
                iosAddress: this.spliteCode(data?.qr_code)[1],
                iosURL: this.spliteCode(data?.qr_code)[2],
                qrCodeString: data?.qr_code,
                qr_url: data?.qrcode_url,
                affiliteUrl: '',
                affiliate_dashboard_url: ''
            };

            let affiliateCode = order?.affiliateCode

            if (affiliateCode) {
                let affiliate_code = affiliateCode ? affiliateCode : "";
                const leaddynoPayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                    purchase_amount: order.transaction.amount,
                    code: affiliate_code
                }
                const leadDynoPurchase = await this._api.leaddynoCreatePurchase(leaddynoPayload);
                let affiliatePayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                }
                const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
                console.log(leadDynoPurchase);
                console.log(getAffiliateUrl);
                emailData = {
                    ...emailData,
                    affiliteUrl: getAffiliateUrl?.affiliate_url,
                    affiliate_dashboard_url: getAffiliateUrl?.affiliate_dashboard_url
                }
                console.log("email data: ", emailData)
            }

            await this._mail.sendOrderEmail(emailData);

            const resData = {
                ...data,
                customer: order.customer,
                device_os: order.device_os,
                device_name: order.device_name,
                order_date: order.created_at,
                plan: {
                    ...order.plan,
                    price: order.transaction.amount

                },
                affiliteUrl: emailData.affiliteUrl,
                affiliate_dashboard_url: emailData.affiliate_dashboard_url
            };

            this._socket.boardCastMsg('order-status', { topic: 'order-completed', trans_id: order.transaction.id, message: "Your order is complete now!", data: resData, success: true })

            return this.res.generateResponse(HttpStatus.OK, `${order.order_code} order has been completed .`, resData, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async purchaseEsimWithElipa(body: PurchaseElipaDto, req: Request) {
        try {

            const { affiliateCode, coupon_code, customer_id, deviceId, order_by, plan_id, country_iso3, phone_number } = body;

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customer_id
                }
            })

            if (!customer) {
                throw new HttpException("Invalid Customer ID!", HttpStatus.BAD_REQUEST)
            }

            const plan = await this._plansRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!plan) {
                throw new HttpException("Invalid Plan ID!", HttpStatus.BAD_REQUEST)
            }

            const device = (await this._api.getDeviceListByID(deviceId)).data;

            if (!device) {
                throw new HttpException("Invalid Device ID!", HttpStatus.BAD_REQUEST)
            }

            const requestEsimPayload = {
                plan_id: plan.package_id
            }
            const { code, data } = await this._api.requestProductOrder(requestEsimPayload);

            if (code != 200) throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR);

            const amount = await this.calculatePlansAmount([plan], coupon_code, req);

            const elipaPayload = {
                order_no: data.order_id,
                amount: amount,
                customer_email: customer.email,
                phone_number: phone_number,
                country_iso3: country_iso3
            }

            const elipaResouce : any = await this._general.getElipaResource(elipaPayload);

            if (!elipaResouce) {
                throw new HttpException("Invalid Country Selected", HttpStatus.BAD_REQUEST)
            }

            let token = `ELIPA-${elipaResouce.transaction_ref}`;

            const mobileMoneyTransRow = this._MobileMoneyRepo.create({
                country_code: country_iso3,
                currency: elipaResouce.currency,
                phone_number: phone_number,
                status: 'PENDING',
                tr_ref: token
            })

            const mobileMoneyTransaction = await this._MobileMoneyRepo.save(mobileMoneyTransRow);

            const transaction = this._transRepo.create({
                transaction_token: token,
                note: `roambuddy customer: (${customer.email}) buy Plan for Europe`,
                status: 'PENDING',
                amount: amount,
                mobileMoney: mobileMoneyTransaction
            })

            await this._transRepo.save(transaction);

            const setRecord = this._ordersRepo.create({
                status: "PENDING",
                order_code: data.order_id,
                order_by: 6,
                couponCode: coupon_code,
                device_os: device.os,
                device_name: device.name,
                customer: customer,
                plan: plan,
                transaction: transaction,
                affiliateCode: affiliateCode
            })
            await this._ordersRepo.save(setRecord);

            const resData = {
                token: token,
                transaction_id: transaction.id,
                order_no: data.order_id,
                ...elipaResouce
            }

            return this.res.generateResponse(HttpStatus.OK, "Order requested successfully", resData, req);



        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async verifyElipaPaymentAndGetOrder(query: ElipaVerifyQuery, req: Request) {

        try {

            const { order_no, status } = query;

            const order = await this._ordersRepo.findOne({
                where: {
                    order_code: order_no
                },
                relations: {
                    plan: true,
                    transaction: {
                        mobileMoney: true
                    },
                    customer: true
                }
            })

            if (!order || order.status == 'COMPLETED' || order.transaction.status == 'FAILED') throw new HttpException("In-valid Order no provided!", HttpStatus.BAD_REQUEST);

            const transaction_token: string[] = order.transaction.transaction_token.split('-');

            const oid = transaction_token[1];

            const payload = {
                oid: oid,
                country_code: order.transaction.mobileMoney.country_code,
                order_no: order.order_code,
                phone_number: order.transaction.mobileMoney.phone_number,
                customer_email: order.customer.email,
                amount: order.transaction.amount,
                status: status
            }


            const isVerified = await this._general.verifyElipaPayment(payload)

            if (!isVerified) {

                await this._transRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'FAILED'
                    })
                    .where('id = :id', { id: order.transaction.id })
                    .execute()


                return this.res.generateResponse(HttpStatus.FORBIDDEN, "Your transaction has failed", null, req)

            }


            const smConfirmOrder = {
                order_id: order.order_code
            }

            const confirmOrderResponse = await this._api.completeOrder(smConfirmOrder);

            const { data, code, message } = confirmOrderResponse;

            if (code != 200) {
                return this.res.generateResponse(code, message, data, req);
            }

            await this._ordersRepo.createQueryBuilder('Orders')
                .update()
                .set({
                    apn: data?.apn,
                    qr_code: data?.qr_code,
                    qrcode_url: data?.qrcode_url,
                    data_roaming: data?.data_roaming,
                    iccid: data?.iccid,
                    status: 'COMPLETED',
                })
                .where("id = :id", { id: order.id })
                .execute();


            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.id })
                .execute();

            let emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_id: order.order_code,
                order_date: moment(order.created_at).format('MMMM Do YYYY'),
                iccid: data?.iccid,
                apn: data?.apn,
                dataRoaming: data?.data_roaming,
                paymentType: this.getPaymentTpe(order.order_by),
                email: order.customer.email,
                packageData: order.plan.data,
                packageValidity: order.plan.validity,
                planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
                payment: order.transaction.amount,
                os: order.device_os,
                device: order.device_name,
                iosAddress: this.spliteCode(data?.qr_code)[1],
                iosURL: this.spliteCode(data?.qr_code)[2],
                qrCodeString: data?.qr_code,
                qr_url: data?.qrcode_url,
                affiliteUrl: '',
                affiliate_dashboard_url: ''
            };

            let affiliateCode = order?.affiliateCode

            if (affiliateCode) {
                let affiliate_code = affiliateCode ? affiliateCode : "";
                const leaddynoPayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                    purchase_amount: order.transaction.amount,
                    code: affiliate_code
                }
                const leadDynoPurchase = await this._api.leaddynoCreatePurchase(leaddynoPayload);
                let affiliatePayload = {
                    key: process.env.PRIVATE_KEY,
                    email: order.customer.email,
                }
                const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
                console.log(leadDynoPurchase);
                console.log(getAffiliateUrl);
                emailData = {
                    ...emailData,
                    affiliteUrl: getAffiliateUrl?.affiliate_url,
                    affiliate_dashboard_url: getAffiliateUrl?.affiliate_dashboard_url
                }
                console.log("email data: ", emailData)
            }

            await this._mail.sendOrderEmail(emailData);

            const resData = {
                ...data,
                customer: order.customer,
                device_os: order.device_os,
                device_name: order.device_name,
                order_date: order.created_at,
                plan: {
                    ...order.plan,
                    price: order.transaction.amount

                },
                affiliteUrl: emailData.affiliteUrl,
                affiliate_dashboard_url: emailData.affiliate_dashboard_url
            };

            this._socket.boardCastMsg('order-status', { topic: 'order-completed', trans_id: order.transaction.id, message: "Your order is complete now!", data: resData, success: true })

            return this.res.generateResponse(HttpStatus.OK, `${order.order_code} order has been completed .`, resData, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }


    async convertAmount(data: any) {

        const { amount, countryCode, network } = data
        const convertTrxAmountToKHS: any = await this._general.currencyConverter('KES', amount);

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

    async getCouponDisc(coupon: any) {
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
}
