import { HttpException, HttpStatus, Inject, Injectable, Body } from '@nestjs/common';
import { AuthorizeFWCardDto, DPODto, DpoVerifyDto, ElipaDto, ElipaVerifyDto, FWCardDto, FwMMDto, PawaPayDto, PayStackDto, PesapalDto, StripeDto, ValidationFWCardDto } from './recharge-customer-wallet.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/service/response.service';
import { ApiService } from 'src/shared/service/api.service';
import { GeneralService } from 'src/shared/service/general.service';
import { JwtService } from 'src/shared/service/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Customers } from 'src/entities/customer.entity';
import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { Transactions } from 'src/entities/transactions.entity';
import Stripe from 'stripe';
import convertor from 'convert-string-to-number';
import * as moment from 'moment';
import { SocketGateway } from 'src/socket/socket.gateway';
import { PesaPalDto } from 'src/purchase-esim/purchase-esim.dto';

@Injectable()
export class RechargeCustomerWalletService {

    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });
    constructor(
        @InjectRepository(Customers) private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(CustomerWallet) private readonly _customerWalletRepo: Repository<CustomerWallet>,
        @InjectRepository(CustomerWalletHistory) private readonly _customerWalletHisRepo: Repository<CustomerWalletHistory>,
        @InjectRepository(MobileMoneyTransactions) private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(Transactions) private readonly _transRepo: Repository<Transactions>,
        @Inject("RESPONSE-SERVICE") private _res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        @Inject('JWT-SERVICE') private _jwt: JwtService,
        private _socket: SocketGateway
    ) { }

    // RECHARGE CUSTOMER WALLET WITH STRIPE START
    async rechargeWalletWithStripe(body: StripeDto, req: Request) {
        try {


            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { stripe_token, amount } = body;

            const customer = await this.validateCustomer(customer_id);

            // pre recharge wallet process
            const preRechargePayload = {
                token: stripe_token,
                customer: customer,
                amount: amount,
                mobilemoney: null
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            // stripe charge integration

            const charge = await this.STRIPE.charges.create({
                amount: convertor((amount * 100).toFixed(2)),
                currency: 'usd',
                source: stripe_token,
                description: `recharge wallet ${customer.email}`
            });

            this.postRechargeProcess(transaction, customer)

            return this._res.generateResponse(HttpStatus.OK, "Wallet recharge sucessfully", null, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
    // RECHARGE CUSTOMER WALLET WITH STRIPE END

    // RECHARGE CUSTOMER WALLET WITH FW MM START

    async rechargeWalletWithFWMobileMoney(body: FwMMDto, req: Request) {
        try {

            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { phone_number, currency, network, amount } = body;

            const customer = await this.validateCustomer(customer_id);

            const token = this._general.generateTransactionRef()

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: null
                }
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            const transactionPayload = {
                phone_number: transaction.mobileMoney.phone_number,
                amount: amount,
                currency: transaction.mobileMoney.currency,
                email: customer.email,
                tx_ref: transaction.mobileMoney.tr_ref,
                network: transaction.mobileMoney.network
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

    async flutterWaveWebhookWalletRechargeComplete(transaction: Transactions, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: transaction.transaction_token
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(key, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                return
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

        } catch (error) {
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "we are facing issues to complete your recharge, please contact support"
                }
            })
        }
    }
    // RECHARGE CUSTOMER WALLET WITH FW MM END

    // RECHARGE CUSTOMER WALLET WITH PAWA-PAY START
    async rechargeWalletWithPawaPay(body: PawaPayDto, req: Request) {
        try {

            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { phone_number, currency, network, country_code, amount } = body;

            const customer = await this.validateCustomer(customer_id);

            const token = this._general.generateDepositId()

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: {
                    phone_number: phone_number,
                    currency: currency,
                    network: network,
                    country_code: country_code
                }
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            // convert amount into selected country currency
            const convertedAmount = await this._general.currencyConvertorV2(transaction.mobileMoney.currency, amount)
            const transactionPayload = {
                depositId: transaction.mobileMoney.tr_ref,
                amount: convertedAmount.toFixed(0),
                currency: transaction.mobileMoney.currency,
                country: transaction.mobileMoney.country_code,
                correspondent: transaction.mobileMoney.network,
                payer: {
                    type: "MSISDN",
                    address: {
                        value: transaction.mobileMoney.phone_number
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

                tr_ref: transaction.transaction_token,
                redirect: false,
                redirectUrl: null,
                msg: 'Please approved payment!'
            }

            return this._res.generateResponse(HttpStatus.OK, `Please approved your payment`, data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async pawaPayWebhookWalletRechargeComplete(transaction: Transactions, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: transaction.transaction_token
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(key, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                return
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

        } catch (error) {
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "we are facing issues to complete your recharge, please contact support"
                }
            })
        }
    }
    // RECHARGE CUSTOMER WALLET WITH PAWA-PAY END


    // RECHARGE CUSTOMER WALLET WITH PESA-PAL START

    async rechargeWalletWithPesaPal(body: PesapalDto, req: Request) {
        try {

            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { amount } = body;

            const customer = await this.validateCustomer(customer_id);

            const token = this._general.generateDepositId()

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: null
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            const transactionPayload = {
                id: transaction.transaction_token,
                currency: 'USD',
                amount: amount,
                description: `purchase eSim plan`,
                callback_url: `${process.env.REDIRECT_URL}/customer/dashboard?tr_rf=${transaction.transaction_token}&method=pesapal&type=WALLET`,
                redirect_mode: "",
                notification_id: process.env.PESAPAL_IPN,
                billing_address: {
                    email_address: customer.email,
                    first_name: customer.firstname,
                    last_name: customer.lastname
                }

            }

            const transactionIntent = await this._api.submitTransaction(transactionPayload);

            if (transactionIntent.status != "200") {
                throw new HttpException("Something went wrong in payment process", HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const data = {
                tr_ref: transaction.transaction_token,
                redirect: true,
                redirectUrl: transactionIntent.redirect_url,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async pesaPalWebhookWalletRechargeComplete(transaction: Transactions, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: transaction.transaction_token
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(key, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                return
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

        } catch (error) {
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "we are facing issues to complete your recharge, please contact support"
                }
            })
        }
    }
    // RECHARGE CUSTOMER WALLET WITH PESA-PAL END


    // RECHARGE CUSTOMER WALLET WITH FW-CARD START      

    async rechargeWalletWithFWCard(body: FWCardDto, req: Request) {
        try {

            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { amount, ...card_details } = body;

            const customer = await this.validateCustomer(customer_id);

            const token = this._general.generateTransactionRef()

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: null
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

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
                tr_ref: transaction.transaction_token,
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
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const customer = await this.validateCustomer(customer_id);

            const transaction = await this._transRepo.findOne({
                where: {

                    transaction_token: tr_ref,
                    status: 'PENDING'

                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) throw new HttpException("Invalid Card details", HttpStatus.BAD_REQUEST);


            let payload: any = {
                cardHolder_fullname: body.cardHolder_fullname,
                card_number: body.card_number,
                card_cvc: body.card_cvc,
                card_month: body.card_month,
                card_year: body.card_year,
                token: tr_ref,
                amount: transaction.amount,
                customer_email: customer.email,
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
                tr_ref: transaction.transaction_token,
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

            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const customer = await this.validateCustomer(customer_id);

            const transaction = await this._transRepo.findOne({
                where: {

                    transaction_token: tr_ref,
                    status: 'PENDING'

                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) throw new HttpException("Invalid Card details", HttpStatus.BAD_REQUEST);

            const validatePayload = {
                otp: otp,
                flw_ref: flw_ref
            }

            const validate = await this._general.validateFWCard(validatePayload);

            if (validate?.status != 'success') throw new HttpException('Something went wrong in payment process', HttpStatus.BAD_REQUEST);

            const data = {
                tr_ref: transaction.transaction_token,
                redirect: false,
                redirectUrl: null,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // RECHARGE CUSTOMER WALLET WITH FW-CARD START

    // RECHARGE CUSTOMER WALLET WITH DPO START

    async rechargeWalletWithDPO(body: DPODto, req: Request){
        try {
            
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { amount } = body;

            const customer = await this.validateCustomer(customer_id);

            const payload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'createToken',
                Transaction: {
                    PaymentAmount: amount,
                    PaymentCurrency: 'USD',
                    CompanyRef: amount,
                    RedirectURL: `${process.env.DPO_REDIRECT_URL}?recharge_amount=${amount}&type=WALLET&method=DPO`,
                    BackURL: process.env.DPO_REDIRECT_URL,
                    customerEmail: customer.email,
                    customerFirstName: customer.firstname,
                    customerLastName: customer.lastname
                },
                Services: {
                    Service: {
                        ServiceType: process.env.DPO_SERVICE_TYPE,
                        ServiceDescription:  `Customer ${customer.email} recharge his wallet`,
                        ServiceDate: moment().format('YYYY/MM/DD HH:MM')
                    }
                }
            }

            const token = await this._general.generateDPOToken(payload);

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: null
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            const data = {
                tr_ref: transaction.transaction_token,
                redirect: true,
                redirectUrl:`${process.env.DPO_PAYMENT_URL}${token}`,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);

        } catch (error) {
            return this._res.generateError(error, req)
        }
    }

    async verifyDpoPayment(body: DpoVerifyDto, req: Request){
        try {
            
            const { tr_ref } = body;

            const dpoVerifypayload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'verifyToken',
                // TransactionToken: process.env.DPO_ACTIVE_MODE == 'TEST' ? process.env.DPO_TEST_TOKEN : pureToken
                TransactionToken: tr_ref
            }

            const verifyTokenResponse: any = await this._api.dpoVerifyToken(dpoVerifypayload);

            if(verifyTokenResponse.API3G.Result._text != '000') throw new HttpException("your transaction not paid yet", HttpStatus.BAD_REQUEST);

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: tr_ref
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(tr_ref, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                throw new HttpException("we are facing issues to complete your recharge, please contact support", HttpStatus.BAD_REQUEST);
                
            }

            const transaction = await this._transRepo.findOne({
                where: {
                    transaction_token: tr_ref,
                    status: 'PENDING'
                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) {
                throw new HttpException("we are facing issues to complete your recharge, please contact support", HttpStatus.BAD_REQUEST);
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(tr_ref, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Wallet recharge sucessfully", null, req);
            

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
    // RECHARGE CUSTOMER WALLET WITH DPO END

    // RECHARGE CUSTOMER WALLET WITH E-Lipa START

    async rechargeWalletWithElipa(body: ElipaDto, req:Request){
        try {
            
            const { amount, phone_number, country_code } = body
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const customer = await this.validateCustomer(customer_id);
            const token = this._general.generateDepositId();

            // elipa Integration
            const elipaPayload = {
                order_no: `WALLET-${token}`,
                amount: amount,
                customer_email: customer.email,
                phone_number: phone_number,
                country_iso3: country_code,
                token: token,
                type: 'WALLET'
            }

            const elipaResouce = await this._general.getElipaResource(elipaPayload);

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: {
                    phone_number: phone_number,
                    currency: null,
                    network: null,
                    country_code: country_code
                }
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);

            const data = {
                tr_ref: transaction.transaction_token,
                redirect: true,
                redirectUrl: elipaResouce.redirect_URL,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);



        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async verifyElipaPayment(body: ElipaVerifyDto, req:Request){
        try {
            
            console.log("Elipa Status:", body);
            const { tr_ref, trans_status } = body;

            if (trans_status != 'aei7p7yrx4ae34') {
                throw new HttpException("Your transaction has been failed,  please contact support", HttpStatus.BAD_REQUEST);
            }

            this._socket.sendTransactionUpdates(tr_ref, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: tr_ref
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(tr_ref, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                throw new HttpException("we are facing issues to complete your recharge, please contact support", HttpStatus.BAD_REQUEST);
                
            }

            const transaction = await this._transRepo.findOne({
                where: {
                    transaction_token: tr_ref,
                    status: 'PENDING'
                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) {
                throw new HttpException("we are facing issues to complete your recharge, please contact support", HttpStatus.BAD_REQUEST);
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(tr_ref, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

            return this._res.generateResponse(HttpStatus.OK, "Wallet recharge sucessfully", null, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    // RECHARGE CUSTOMER WALLET WITH E-Lipa END

    // RECHARGE CUSTOMER WALLET WITH PAY-STACK START

    async rechargeWalletWithPaystack(body: PayStackDto, req:Request){
        try {
            
            const { id: customer_id } = await this._jwt.decodeCustomer(req.headers.authorization);
            const { amount } = body;

            const customer = await this.validateCustomer(customer_id);

            // initialize paystack payment
            const convertedAmount =  parseInt(await this._general.currencyConvertorV2('NGN', amount))
            const payStackPayload = {
                email: customer.email,
                amount: convertedAmount,
                callback_url: `${process.env.PAYSTACK_REDIRECT_URL}?method=paystack&type=TOPUP`,
                metadata: { cancel_action: process.env.REDIRECT_URL }
            }

            const paymentIntent = await this._api.payStackInitializePayment(payStackPayload);

            const token = paymentIntent.data.reference

            // pre recharge wallet process
            const preRechargePayload = {
                token: token,
                customer: customer,
                amount: amount,
                mobilemoney: null
            }

            const transaction = await this.preRechargeProcess(preRechargePayload);
            

            const data = {
                tr_ref: transaction.transaction_token,
                redirect: true,
                redirectUrl: paymentIntent.data.authorization_url,
                msg: 'provide payment details',
            }

            return this._res.generateResponse(HttpStatus.OK, "Please provide payment details in next page", data, req);


        } catch (error) {
            return this._res.generateError(error, req);
        }
    }

    async payStackWebhookWalletRechargeComplete(transaction: Transactions, key: string) {
        try {

            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: true,
                    message: "Payment Recieved please wait"
                }
            })

            const customer = await this._customerRepo.findOne({
                where: {
                    wallet: {
                        history: {
                            transaction: {
                                transaction_token: transaction.transaction_token
                            }
                        }
                    }
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            if (!customer) {

                this._socket.sendTransactionUpdates(key, {
                    topic: 'transaction-updates',
                    data: {
                        sucess: false,
                        message: "we are facing issues to complete your recharge, please contact support"
                    }
                })

                return
            }

            this.postRechargeProcess(transaction, customer)

            this._socket.sendOrderCompleteNotification(key, {
                topic: 'order-completed',
                data: {
                    sucess: true,
                    message: "your wallete recharge sucessfully",
                    order: null
                }
            })

        } catch (error) {
            console.log(error);
            this._socket.sendTransactionUpdates(key, {
                topic: 'transaction-updates',
                data: {
                    sucess: false,
                    message: "we are facing issues to complete your recharge, please contact support"
                }
            })
        }
    }

    // RECHARGE CUSTOMER WALLET WITH PAY-STACK END

    // **GENERAL FUNCTION WITHIN SERVICE**

    private async validateCustomer(customer_id: number): Promise<Customers> {

        const customer = await this._customerRepo.findOne({
            where: {
                deleted_at: IsNull(),
                id: customer_id
            },
            relations: {
                wallet: {
                    history: true
                }
            }
        })

        if (!customer) throw new HttpException("Invalid customer id provide", HttpStatus.BAD_REQUEST);

        return customer;
    }

    private async preRechargeProcess(data: any): Promise<Transactions> {

        const { token, amount, mobilemoney, customer } = data;

        let mobileMoney = null;
        if (mobilemoney) {

            mobileMoney = this._MobileMoneyRepo.create({
                tr_ref: token,
                status: 'PENDING',
                ...mobilemoney,
            });

            await this._MobileMoneyRepo.save(mobileMoney);
        }

        const transaction = this._transRepo.create({
            status: 'PENDING',
            amount: amount,
            transaction_token: token,
            note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
            mobileMoney: mobileMoney
        })
        await this._transRepo.save(transaction);

        const wallet_history = this._customerWalletHisRepo.create({
            message: `you have topup $${amount} into your wallet`,
            credit: amount,
            debit: null,
            wallet_id: customer.wallet,
            transaction: transaction
        })
        await this._customerWalletHisRepo.save(wallet_history);

        return await this._transRepo.findOne({ where: { id: transaction.id }, relations: { mobileMoney: true } })
    }

    private async postRechargeProcess(transaction: Transactions, customer: Customers) {

        // update transaction status
        await this._transRepo.createQueryBuilder()
            .update()
            .set({
                status: 'COMPLETED'
            })
            .where("id = :id", { id: transaction.id })
            .execute()

        // if mobile money exist update status
        if (transaction.mobileMoney) {
            await this._MobileMoneyRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: transaction.mobileMoney.id })
                .execute()
        }

        await this._customerWalletRepo.createQueryBuilder()
            .update()
            .set({
                wallet_balance: convertor(customer.wallet.wallet_balance) + convertor(transaction.amount)
            })
            .where("id = :id", { id: customer.wallet.id })
            .execute()

    }
}
