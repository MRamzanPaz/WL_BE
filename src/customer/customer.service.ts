import { HttpStatus, Inject, Injectable, Body, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { ResponseService } from 'src/shared/service/response.service';
import { Any, In, IsNull, Like, Repository, ReturningStatementNotSupportedError, LessThan } from 'typeorm';
import { AuthenitcateCustomer, ChangePassword, ChangeVerificationStatus, CreateCustomer, PaginationDto, RechargeCountryDto, RechargeEsimDPODto, RechargeEsimDto, RechargeEsimFWCardAuthorizeDto, RechargeEsimFWCardDto, RechargePackagesDto, RechargeQueryDto, TopupDto, ValidateFWRechargeDto, WalletRechargeCardDto, WalletTopupCardDto, WalletTopupMobMoneyDto, WalletTopupPawaPayDto, WalletTopupPesaPalDto } from './customer.dto';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { JwtService } from 'src/shared/service/jwt.service';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { ApiService } from 'src/shared/service/api.service';
import { Plans } from 'src/entities/plans.entites';
import { GeneralService } from 'src/shared/service/general.service';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import convertor from 'convert-string-to-number';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { ActivatedESims } from 'src/entities/activatedEsim.entity';
import { MailService } from 'src/mail/mail.service';
import { Transactions } from 'src/entities/transactions.entity';
import { StripeCreateTokenDto } from 'src/shared/dtos/stripeCreateToken.dto';
import { WalletCardDto } from 'src/payments/payments.dto';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import * as generator from 'otp-generator';
import { SocketGateway } from 'src/socket/socket.gateway';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { Coupons } from 'src/entities/coupon.entity';
import { CouponsDetails } from 'src/entities/couponsDetails.entity';
import { PaymentCacheFW } from 'src/entities/paymentCache.entity';
import * as moment from 'moment';
import { Countries } from 'src/entities/country.entity';
import { CustomerVerification } from 'src/entities/customer_verification';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
@Injectable()
export class CustomerService {

    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' })

    constructor(
        @InjectRepository(Customers)
        private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(CustomerVerification)
        private readonly _customerVerification: Repository<CustomerVerification>,
        @InjectRepository(CustomerWallet)
        private readonly _customerWalletRepo: Repository<CustomerWallet>,
        @InjectRepository(Plans)
        private readonly _planstRepo: Repository<Plans>,
        @InjectRepository(Countries)
        private readonly _countryRepo: Repository<Countries>,
        @InjectRepository(EsimOrders)
        private readonly _eOrdersRepo: Repository<EsimOrders>,
        @InjectRepository(TopupOrders)
        private readonly _topupOrdersRepo: Repository<TopupOrders>,
        @InjectRepository(ActivatedESims)
        private readonly _activatedSimsRepo: Repository<ActivatedESims>,
        @InjectRepository(Transactions)
        private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(CustomerWalletHistory)
        private readonly _customerWalletHisRepo: Repository<CustomerWalletHistory>,
        @InjectRepository(MobileMoneyTransactions)
        private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(Coupons)
        private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(CouponsDetails)
        private readonly _couponDetRepo: Repository<CouponsDetails>,
        @InjectRepository(PaymentCacheFW)
        private readonly _paymentCacheRepo: Repository<PaymentCacheFW>,
        @InjectRepository(plans_Counties)
        private readonly _plansCountryRepo: Repository<plans_Counties>,
        @InjectRepository(AccountingReport)
        private readonly _accReportRepo: Repository<AccountingReport>,
        @InjectRepository(PawapayTransactions)
        private readonly _pawapayTransactions: Repository<PawapayTransactions>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('JWT-SERVICE') private jwt: JwtService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        private _mail: MailService,
        private _socket: SocketGateway
    ) { }

    async createCustomer(body: CreateCustomer, req: Request) {

        const { firstname, middle_name ,lastname, email, phone_number, country_of_residence, address_detail, address_detail_usa } = body;

        try {

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email.trim()
                },
                relations: {
                    wallet: true
                },
                select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    email: true,
                }
            })

            if (customer) {
                let payload = {
                    ...customer,
                    newUser: false
                }
                return this.res.generateResponse(HttpStatus.OK, "Customer detiales!", payload, req);
            }

            const tempPass = `${firstname.trim()}123456`

            const salt = await bcrypt.genSalt(10);
            const hashPass = await bcrypt.hash(tempPass, salt);

            const payLoad: Customers | any = {
                firstname: firstname,
                lastname: lastname,
                email: email.trim(),
                password: hashPass,
                phone_number: phone_number,
                country_of_residence: country_of_residence,
                address_detail: address_detail,
                address_detail_usa: address_detail_usa,
                middle_name: middle_name
            }

            const createCustomer: any = this._customerRepo.create(payLoad);
            await this._customerRepo.save(createCustomer)

            const createWallet = this._customerWalletRepo.create({
                wallet_balance: 0
            })
            await this._customerWalletRepo.save(createWallet)

            await this._customerRepo.createQueryBuilder('Customers')
                .update()
                .set({
                    wallet: createWallet
                })
                .where("id = :id", { id: createCustomer.id })
                .execute()

            const createdCustomer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: createCustomer.id
                },
                relations: {
                    wallet: true
                },
                select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    email: true,
                }
            })

            const emailData = {
                to: email,
                customer_name: firstname + ' ' + lastname,
                customer_email: email,
                customer_pass: tempPass
            }

            await this._mail.sendCustomerEmail(emailData)


            let payload = {
                ...createCustomer,
                newUser: true
            }


            return this.res.generateResponse(HttpStatus.OK, "Customer details!", payload, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async authenticateCustomer(body: AuthenitcateCustomer, req: Request) {

        try {

            const { email, password } = body;

            const findOne: Customers = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email.trim()
                }
            })

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please provide valid email address!", null, req);
            }

            const { password: encryptedPass } = findOne;

            const isMatch = await bcrypt.compare(password, encryptedPass);

            if (!isMatch) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please provide valid password!", null, req);
            }

            const jwtPayload = {
                id: findOne.id,
                email: findOne.email,
                fistname: findOne.firstname,
                lastname: findOne.lastname,
            }

            const token = this.jwt.createCustomerAuth(jwtPayload);

            await this._customerRepo.createQueryBuilder('Customers')
                .update()
                .set({
                    auth_token: token
                })
                .where("id = :id", { id: findOne.id })
                .execute()


            const data = {
                id: findOne.id,
                email: findOne.email,
                firstname: findOne.firstname,
                lastname: findOne.lastname,
                auth_token: token
            }

            return this.res.generateResponse(HttpStatus.OK, "Customer authenticate successfully!", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async verifyEmail(email: string, req: Request) {

        try {

            const findOneCustomer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email
                }
            })

            if (!findOneCustomer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid email address", null, req);
            }

            const otp_code = generator.generate(6, {
                digits: true,
                lowerCaseAlphabets: true,
                upperCaseAlphabets: true,
                specialChars: false
            })

            await this._customerRepo.createQueryBuilder('Customers')
                .update()
                .set({
                    otp_code: otp_code
                })
                .where("id = :id", { id: findOneCustomer.id })
                .execute()

            const emailData = {
                to: findOneCustomer.email,
                code: otp_code
            }

            await this._mail.sendOtpCode(emailData)

            return this.res.generateResponse(HttpStatus.OK, "please check your email", [], req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async verifyNewUserEmail(email: string, req: Request) {

        try {

            const isValidEmail = await this._api.verifyEmail(email);


            const { Valid, IsDisposable } = isValidEmail;


            if (!Valid) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Your email is not valid", [], req)
            }

            if (IsDisposable) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Your email is Disposable, Please enter valid email", [], req)
            }

            const findVerifyCustomer = await this._customerVerification.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email,
                    isVerified: true
                }
            })

            if (findVerifyCustomer) {
                const payload = {
                    verifiedUser: true
                }
                return this.res.generateResponse(HttpStatus.OK, "Your Account is Already Verified", payload, req);
            }

            const findUnVerifyCustomer = await this._customerVerification.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email,
                    isVerified: false
                }
            })

            const otp_code = generator.generate(6, {
                digits: true,
                lowerCaseAlphabets: true,
                upperCaseAlphabets: true,
                specialChars: false
            })

            if (findUnVerifyCustomer) {
                await this._customerVerification.createQueryBuilder('customer_verification')
                    .update()
                    .set({
                        otp_code: otp_code
                    })
                    .where("id = :id", { id: findUnVerifyCustomer.id })
                    .execute()

                const emailData = {
                    to: email,
                    code: otp_code
                }

                await this._mail.sendOtpCodeForVerification(emailData)
                const payload = {
                    verifiedUser: false
                }
                return this.res.generateResponse(HttpStatus.OK, "Please check your email", payload, req)
            }


            const createUserVeri = this._customerVerification.create({
                email: email,
                otp_code: otp_code,
                isVerified: false
            });

            await this._customerVerification.save(createUserVeri);

            const emailData = {
                to: email,
                code: otp_code
            }

            await this._mail.sendOtpCodeForVerification(emailData)
            const payload = {
                verifiedUser: false
            }
            return this.res.generateResponse(HttpStatus.OK, "Please check your email for verification", payload, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async changePassword(body: ChangePassword, req: Request) {

        try {

            const { email, otp_code, password } = body;

            const findOne = await this._customerRepo.findOne({
                where: {
                    email: email,
                    otp_code: otp_code,
                    deleted_at: IsNull()
                }
            })

            // console.log(findOne)

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please enter valid opt code", null, req)
            }

            const salt = await bcrypt.genSalt(10);
            const hashPass = await bcrypt.hash(password, salt);

            await this._customerRepo.createQueryBuilder('Customers')
                .update()
                .set({
                    password: hashPass,
                    otp_code: null
                })
                .where("id = :id", { id: findOne.id })
                .execute()

            return this.res.generateResponse(HttpStatus.OK, "Your password has been changed!", [], req)


        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async changeVerificationStatus(body: ChangeVerificationStatus, req: Request) {

        try {

            const { email, otp_code } = body;

            const findOne = await this._customerVerification.findOne({
                where: {
                    email: email,
                    otp_code: otp_code,
                    deleted_at: IsNull()
                }
            })

            // console.log(findOne)

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please enter valid opt code", null, req)
            }

            await this._customerVerification.createQueryBuilder('customer_verification')
                .update()
                .set({
                    isVerified: true
                })
                .where("id = :id", { id: findOne.id })
                .execute()

            return this.res.generateResponse(HttpStatus.OK, "Your account is verified!", [], req)


        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllCustomerByPagination(params: PaginationDto, req: Request) {
        try {

            const { page, pageSize, searchStr } = params;

            const findAllCustomers = await this._customerRepo.find({
                where: [
                    { deleted_at: IsNull(), firstname: Like(`%${searchStr}%`) },
                    { deleted_at: IsNull(), lastname: Like(`%${searchStr}%`) },
                    { deleted_at: IsNull(), email: Like(`%${searchStr}%`) }
                ],
                select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    email: true
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            })

            const total_count = await this._customerRepo.count({
                where: [
                    { deleted_at: IsNull(), firstname: Like(`%${searchStr}%`) },
                    { deleted_at: IsNull(), lastname: Like(`%${searchStr}%`) },
                    { deleted_at: IsNull(), email: Like(`%${searchStr}%`) }
                ]
            })

            const data = {
                list: findAllCustomers,
                total_count,
                page,
                pageSize
            }

            return this.res.generateResponse(HttpStatus.OK, "Customers List", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async topupWallet(body: WalletRechargeCardDto, req: Request) {

        try {

            const decodedToken:any = await this.jwt.decodeCustomer(req.headers.authorization)

            const customer = await this._customerRepo.findOne({
                where: {
                    id: decodedToken.id,
                    deleted_at: IsNull()
                },
                relations: {
                    wallet: true
                }
            })
            
            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid customer !", null, req)
            }
            const { stripe_token, amount } = body;


            const charge = await this.STRIPE.charges.create({
                amount: amount * 100,
                currency: 'usd',
                source: stripe_token,
                description: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`
            })

            // store transaction
            const createTransaction = this._transRepo.create({
                transaction_token: stripe_token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
                status: 'COMPLETED',
                amount: `${amount}`,
            })
            await this._transRepo.save(createTransaction);

            // update customer wallet
            const _floatAmount = convertor(customer.wallet.wallet_balance)
            const updatedAmount = _floatAmount + amount;
            await this._customerWalletRepo.createQueryBuilder('CustomerWallet')
                .update()
                .set({
                    wallet_balance: updatedAmount
                })
                .where("id = :id", { id: customer.wallet.id })
                .execute()

            // create wallet history
            const walletHistory = this._customerWalletHisRepo.create({
                message: 'You have been topup your wallet',
                credit: amount,
                transaction: createTransaction,
                wallet_id: customer.wallet
            })

            await this._customerWalletHisRepo.save(walletHistory);

            return this.res.generateResponse(HttpStatus.OK, "Wallet topup completed successfully!", null, req)

        } catch (error) {

            return this.res.generateError(error, req);

        }

    }

    async topupWalletWithMobileMoney(body: WalletTopupMobMoneyDto, req: Request) {

        try {

            const decodedToken = await this.jwt.decodeCustomer(req.headers.authorization);

            const { phone_number, currency, network, amount } = body;

            const customer = await this._customerRepo.findOne({
                where: {
                    id: decodedToken.id,
                    deleted_at: IsNull()
                },
                relations: {
                    wallet: true
                }
            })

            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid customer !", null, req)
            }

            let token = this._general.generateTransactionRef();


            let createMobileTransaction = this._MobileMoneyRepo.create({
                phone_number: phone_number,
                currency: currency,
                tr_ref: token,
                status: 'PENDING',
                network: network
            });
            await this._MobileMoneyRepo.save(createMobileTransaction);

            let createTransaction = await this._transRepo.create({
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
                status: 'PENDING',
                amount: amount,
                mobileMoney: createMobileTransaction
            })

            await this._transRepo.save(createTransaction)

            const transactionPayload = {
                phone_number: phone_number,
                amount: amount,
                currency: currency,
                email: customer.email,
                tx_ref: token,
                network: network
            };
            let paymentIntent = await this._general.createMobileMoneyPaymentIntent(transactionPayload);

            const data = {
                ...paymentIntent.data,
                transaction_id: createTransaction.id
            };

            const walletHis = this._customerWalletHisRepo.create({
                credit: parseFloat(amount),
                debit: null,
                message: 'You have been topup your wallet',
                transaction: createTransaction,
                wallet_id: customer.wallet,
            })

            await this._customerWalletHisRepo.save(walletHis);

            return this.res.generateResponse(HttpStatus.OK, "Please approved payment from your side!", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async topupWalletWithPawaPay(body: WalletTopupPawaPayDto, req: Request) {

        try {

            const { customer_id, phone_number, currency, network, amount, country } = body;
            
            const customer = await this._customerRepo.findOne({
                where: {
                    id: parseInt(customer_id),
                    deleted_at: IsNull()
                },
                relations: {
                    wallet: true
                }
            })

            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid customer !", null, req)
            }

            let token = this._general.generateDepositId();

            let createMobileTransaction = this._MobileMoneyRepo.create({
                phone_number: phone_number,
                currency: currency,
                tr_ref: token,
                status: 'PENDING',
                network: network,
                country_code: country
            });
            await this._MobileMoneyRepo.save(createMobileTransaction);

            let createTransaction = await this._transRepo.create({
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
                status: 'PENDING',
                amount: convertor(amount),
                mobileMoney: createMobileTransaction
            })

            await this._transRepo.save(createTransaction);

            const _amount: any = await this._general.currencyConverter(currency, convertor(amount))
            const payload = {
                depositId: token,
                amount: _amount.toFixed(2),
                currency: currency,
                country: country,
                correspondent: network,
                payer: {
                    type: "MSISDN",
                    address: {
                        value: phone_number
                    }
                },
                customerTimestamp: new Date(),
                statementDescription: "Approved your payment"
            }

            const response = await this._api.pawaPayCreateDeposit(payload);
            console.log(response);

            let data: any;
            if (response.status == 'ACCEPTED') {

                const walletHis = this._customerWalletHisRepo.create({
                    credit: parseFloat(amount),
                    debit: null,
                    message: 'You have been topup your wallet',
                    transaction: createTransaction,
                    wallet_id: customer.wallet,
                })

                await this._customerWalletHisRepo.save(walletHis);

                data = {
                    transaction_id: createTransaction.id,
                    tr_ref: token
                }
                return this.res.generateResponse(HttpStatus.OK, "Please approve your payment!", data, req);
            } else {

                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Your payment rejected!", data, req);

            }


        } catch (error) {

            return this.res.generateError(error, req);

        }

    }

    async topupWalletWithPesaPal(body:WalletTopupPesaPalDto , req: Request ){
        try {
            
            const decodedCustomer = await this.jwt.decodeCustomer(req.headers.authorization);

            const customer = await this._customerRepo.findOne({
                where: {
                    id: decodedCustomer.id,
                    deleted_at: IsNull(),
                },
                relations: {
                    wallet: true
                }
            })

            if (!customer) throw new HttpException("Session Failed, please re-login your account!", HttpStatus.BAD_REQUEST);

            const { amount } = body;
            const token = this._general.generateDepositId();

            let createTransaction = await this._transRepo.create({
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her wallet`,
                status: 'PENDING',
                amount: convertor(amount),
            })

            await this._transRepo.save(createTransaction);

            const transactionPayload = {
                id: token,
                currency: 'USD',
                amount: amount,
                description: `Topup Wallet`,
                callback_url: `${process.env.REDIRECT_URL}/customer/dashboard?transaction_id=${token}`,
                redirect_mode: "",
                notification_id: process.env.PESAPAL_IPN,
                billing_address: {
                    email_address: customer.email,
                    first_name: customer.firstname,
                    last_name: customer.lastname
                }

            }

            const transactionIntent = await this._api.submitTransaction(transactionPayload);

            if(transactionIntent.status != '200') throw new HttpException("Something went wrong,  please try again later!", HttpStatus.INTERNAL_SERVER_ERROR);
            
            const walletHis = this._customerWalletHisRepo.create({
                credit: parseFloat(amount),
                debit: null,
                message: 'You have been topup your wallet',
                transaction: createTransaction,
                wallet_id: customer.wallet,
            })

            await this._customerWalletHisRepo.save(walletHis);

            const response = {
                transaction_id: createTransaction.id,
                transaction_token: token,
                order_tracking_id: transactionIntent.order_tracking_id,
                redirect_url: transactionIntent.redirect_url
            }


            return this.res.generateResponse(HttpStatus.OK, "Please verify payment", response, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getCustomerDetilsById(customer_id: string, req: Request) {
        try {
            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    wallet: {
                        id: parseInt(customer_id)
                    }
                },
                relations: {
                    wallet: true
                }
            })

            if (!customer) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Customer not found!", null, req);
            }

            return this.res.generateResponse(HttpStatus.OK, "Customer details!", customer, req);
        }
        catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllRechargeAllEsim(req: Request) {

        try {
            const customer = this.jwt.decodeCustomer(req.headers.authorization);

            // console.log(customer)

            const eSimsList1 = await this._eOrdersRepo.find({
                where: {
                    status: 'COMPLETED',
                    deleted_at: IsNull(),
                    customer: {
                        id: customer.id
                    },
                    plan: {
                        singleUse: false,
                    }
                },
                select: {
                    iccid: true
                }
            })

            // console.log(customer)

            const eSimsList2 = await this._activatedSimsRepo.find({
                where: {
                    deleted_at: IsNull(),
                    customer: {
                        id: customer.id
                    },
                    singleUse: false
                },
                select: {
                    iccid: true
                }
            })

            const data = [
                ...eSimsList1,
                ...eSimsList2
            ]

            return this.res.generateResponse(HttpStatus.OK, "Esim list", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllRechargeData(iccid: string, req: Request) {

        try {

            const { code, message, data } = await this._api.getAllTopupPackages(iccid);
            console.log(data);

            if (code != 200) {
                return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Something Went Wrong !", null, req);
            }

            const packageIds: number[] = data.map((_plan) => _plan.id);
            console.log(packageIds);

            // const countries =  await this._planstCountryRepo.createQueryBuilder('plans_Counties')
            // .where("plans_Counties.deleted_at IS NULL")
            // .leftJoinAndSelect("plans_Counties.Plan", 'plans')
            // .andWhere("plans.package_id IN(:...ids)", {ids: packageIds})
            // .groupBy('plans_Counties.country_code')
            // .select('plans_Counties.country_name')
            // .addSelect("plans_Counties.country_code")
            // .addSelect("plans_Counties.iso2")
            // .addSelect("plans_Counties.iso3")
            // .addSelect("plans_Counties.phone_code")
            // .getMany()

            const countries = await this._planstRepo.query(
                `SELECT c.country_name, c.iso2, c.iso3, c.country_code, c.phone_code FROM plans AS p
                LEFT JOIN countries_of_plans AS cop ON p.id = cop.plansId
                LEFT JOIN countries AS c ON cop.countriesId = c.id
                WHERE p.package_id IN(${packageIds})
                GROUP BY c.id`
            ).finally()

            return this.res.generateResponse(HttpStatus.OK, "Available Countries!", countries, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllRechargeCountry(query: RechargeCountryDto, req: Request) {
        try {

            const { iccid, country_code } = query;

            const { code, message, data: responseData } = await this._api.getAllTopupPackages(iccid);

            if (code != 200) {
                return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Something Went Wrong !", null, req);
            }

            const packageIds: number[] = responseData.map((_plan: any) => _plan.id);

            // const data =  await this._planstCountryRepo.createQueryBuilder('plans_Counties')
            // .where("plans_Counties.deleted_at IS NULL AND plans_Counties.country_code = :country_code", {country_code: country_code})
            // .leftJoinAndSelect("plans_Counties.Plan", 'plans')
            // .andWhere("plans.package_id IN(:...ids)", {ids: packageIds})
            // .groupBy('plans.data')
            // .select('plans.data', "data")
            // .orderBy('CAST(data AS SIGNED)', 'ASC') // CAST is use to convert string number to signed number 
            // .execute()

            const data = await this._planstRepo.query(
                `
                SELECT * FROM plans AS p
                WHERE p.package_id IN(${packageIds})
                GROUP BY p.data
                `
            )

            return this.res.generateResponse(HttpStatus.OK, "Available DATA!", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllpackages(query: RechargePackagesDto, req: Request) {
        try {

            const { iccid, data, country_code } = query;

            const { code, message, data: responseData } = await this._api.getAllTopupPackages(iccid);

            if (code != 200) {
                return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Something Went Wrong !", null, req);
            }

            const packageIds: number[] = responseData.map((_plan: any) => _plan.id);

            const packages = await this._planstRepo.find({
                where: {
                    deleted_at: IsNull(),
                    data: data,
                    package_id: In(packageIds),
                    countires: {
                        country_code: country_code,
                        deleted_at: IsNull()
                    }
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Available packages!", packages, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async rechargeEsim(body: RechargeEsimDto, req: Request) {

        try {

            const { plan_id, iccid, order_by, card_number, card_month, card_year, card_cvc, phone_number, stripe_token, currency, network, country, coupon } = body;
            const customerDecode = this.jwt.decodeCustomer(req.headers.authorization);
            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customerDecode.id
                }
            })

            const findOne = await this._planstRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan not found!", null, req);
            }

            // here convert string to number:
            let amount: any = convertor(findOne.price);

            // validate coupon if exist
            if (coupon) {
                const isValidCoupon: any = await this.validateCoupon(coupon);

                if (!isValidCoupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code or may be expired!", null, req)
                }

                const { discount, isFixed } = isValidCoupon;

                let planPrice = parseFloat(findOne.price)

                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                } else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
            }

            let _amount: any = amount * 100
            _amount = _amount.toFixed(0)


            let token = null;

            // recharge with credit card
            if (order_by == 1) {

                // const createTokenPayload: StripeCreateTokenDto = {
                //     card_cvc: card_cvc,
                //     card_month: card_month,
                //     card_number: card_number,
                //     card_year: card_year
                // }

                // token = await this._general.createStripToken(createTokenPayload);
                token = stripe_token;


                if (!token) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid card details!", null, req);
                }

                //charge stripe card
                const charge = await this.STRIPE.charges.create({
                    amount: _amount,
                    currency: 'usd',
                    source: token,
                    description: `purchase ${findOne.name}`
                })

                if (!charge) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Transaction unSuccessful!", null, req)
                }

                token = `STRIP-${token}`

            }

            // recharge with mobile-moeny (Flutter wave)
            if (order_by == 2) {

                if (!phone_number || !currency) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Please provide correct phone number and curreny!", null, req);
                }

                token = this._general.generateTransactionRef();


                let createMobileTransaction = this._MobileMoneyRepo.create({
                    phone_number: phone_number,
                    currency: currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: network
                });
                await this._MobileMoneyRepo.save(createMobileTransaction);

                const transactionPayload = {
                    phone_number: phone_number,
                    amount: amount,
                    currency: currency,
                    email: customer.email,
                    tx_ref: token,
                    network: network
                };

                let paymentIntent = await this._general.createMobileMoneyPaymentIntent(transactionPayload);

                // create transaction
                const createTransaction = this._transRepo.create({
                    transaction_token: token,
                    note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                    status: 'PENDING',
                    amount: amount,
                    mobileMoney: createMobileTransaction
                })
                // saved transaction
                await this._transRepo.save(createTransaction);

                const createTopupOrder = this._topupOrdersRepo.create({
                    customer: customer,
                    plan: findOne,
                    iccid: iccid,
                    order_by: order_by,
                    transaction: createTransaction
                })

                await this._topupOrdersRepo.save(createTopupOrder)

                const data = {
                    ...paymentIntent.data,
                    order_id: createTopupOrder.id
                }

                return this.res.generateResponse(HttpStatus.OK, "Payment intent created!", data, req);
            }


            // recharge with wallet
            if (order_by == 3) {
                const transactionComplete = await this._general.performWalletTransaction(customer.id, amount, `you have recharge your ${iccid} against ${findOne.name}`);

                if (!transactionComplete) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Your have insufficient balance!", null, req)
                }
                token = 'WALLET'

            }

            if (order_by == 4) {

                token = this._general.generateDepositId();
                let createMobileTransaction = this._MobileMoneyRepo.create({
                    phone_number: phone_number,
                    currency: currency,
                    tr_ref: token,
                    status: 'PENDING',
                    network: network,
                    country_code: country
                });
                await this._MobileMoneyRepo.save(createMobileTransaction);

                const convertedAmount = await this._general.currencyConverter(currency, amount)

                const transactionPayload = {
                    depositId: token,
                    amount: convertedAmount.toFixed(0),
                    currency: currency,
                    country: country,
                    correspondent: network,
                    payer: {
                        type: "MSISDN",
                        address: {
                            value: phone_number
                        }
                    },
                    customerTimestamp: new Date(),
                    statementDescription: `Approved your payment`
                }
                console.log(transactionPayload);
                const _data = await this._api.pawaPayCreateDeposit(transactionPayload);

                console.log(_data);

                if (_data.status != "ACCEPTED") {
                    return this.res.generateResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Transaction Failed!", null, req)
                }

                let paymentIntent = {
                    code: 1,
                    data: {
                        tr_ref: _data.depositId,
                        redirect: false,
                        redirectUrl: null,
                        msg: 'Please approved payment!'
                    }
                }

                // create transaction
                const createTransaction = this._transRepo.create({
                    transaction_token: token,
                    note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                    status: 'PENDING',
                    amount: amount,
                    mobileMoney: createMobileTransaction
                })
                // saved transaction
                await this._transRepo.save(createTransaction);

                const createTopupOrder = this._topupOrdersRepo.create({
                    customer: customer,
                    plan: findOne,
                    iccid: iccid,
                    order_by: order_by,
                    transaction: createTransaction
                })

                await this._topupOrdersRepo.save(createTopupOrder)

                const data = {
                    ...paymentIntent.data,
                    order_id: createTopupOrder.id
                }

                return this.res.generateResponse(HttpStatus.OK, "Payment intent created!", data, req);




            }
            // recharge with pesapal
            if (order_by == 5) {

                token = this._general.generateDepositId();

                const transaction = this._transRepo.create({
                    transaction_token: token,
                    note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                    status: 'PENDING',
                    amount: amount,
                })

                await this._transRepo.save(transaction);

                const createTopupOrder = this._topupOrdersRepo.create({
                    customer: customer,
                    plan: findOne,
                    iccid: iccid,
                    order_by: order_by,
                    transaction: transaction
                });

                await this._topupOrdersRepo.save(createTopupOrder);

                const transactionPayload = {
                    id: token,
                    currency: 'USD',
                    amount: amount,
                    description: `recharge eSim plan`,
                    callback_url: `${process.env.REDIRECT_URL}/customer/dashboard?order_id=${createTopupOrder.id}`,
                    redirect_mode: "",
                    notification_id: process.env.PESAPAL_IPN,
                    billing_address: {
                        email_address: customer.email,
                        first_name: customer.firstname,
                        last_name: customer.lastname
                    }

                }

                const transactionIntent = await this._api.submitTransaction(transactionPayload);

                let paymentIntent = {
                    code: 1,
                    data: {
                        tr_ref: token,
                        redirect: true,
                        redirectUrl: transactionIntent.redirect_url,
                        msg: 'Please approved payment!'
                    }
                }

                const data = {
                    ...paymentIntent.data,
                    order_id: createTopupOrder.id
                }

                return this.res.generateResponse(HttpStatus.OK, "Payment intent created!", data, req);

            }
            // create transaction
            const createTransaction = this._transRepo.create({
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                status: 'COMPLETED',
                amount: amount,
            })
            // saved transaction
            await this._transRepo.save(createTransaction);

            const payload = {
                iccid: iccid,
                plan_id: findOne.package_id,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                return this.res.generateResponse(HttpStatus.OK, applied.message, applied.data, req)
            }

            const createTopupOrder = this._topupOrdersRepo.create({
                customer: customer,
                plan: findOne,
                iccid: iccid,
                order_by: order_by,
                transaction: createTransaction,
                order_no: applied.data.order_no
            })

            await this._topupOrdersRepo.save(createTopupOrder);

            const emailData = {
                to: customer.email,
                customer_name: `${customer.firstname} ${customer.lastname}`,
                order_no: applied.data.order_no,
                iccid: iccid,
                plan_name: findOne.name,
                data: findOne.data,
                validity: findOne.validity,
                price: amount
            }
            await this._mail.sentRechargeEmail(emailData);

            // if pawapay order by 4 / credit card order by 1 payment then added to accounting report
            if (order_by == 1) {
                const convertTrxAmount: any = parseFloat(amount).toFixed(2);
                const convertCostPrice: any = convertor(parseFloat(convertor(findOne.cost_price)).toFixed(2));
                const convertTrxfeeToDollar: any = (convertTrxAmount * 3) / 100;
                const finalAmountAfterDeduction: any = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);

                let coupDiscount: any = 0;
                if (coupon) {
                    coupDiscount = await this.getCouponDisc(coupon)
                }

                const temp: any = {
                    order_date: moment(createTopupOrder.created_at).format('DD MMMM YYYY'),
                    order_time: moment(createTopupOrder.created_at).format('HH:MM:SS'),
                    order_code: applied.data.order_no,
                    transaction_id: createTransaction.id,
                    customer_fullname: `${customer?.firstname} ${customer?.lastname}`,
                    customer_email: customer?.email,
                    iccId: iccid,
                    plan_name: findOne?.name,
                    data: findOne?.data,
                    validity: findOne.validity,
                    sale_price_inc_VAT: null,
                    sale_price_excl_VAT: findOne?.price,
                    coupon_code: coupon,
                    disc_from_coupon_code: coupDiscount,
                    amount_paid: convertTrxAmount,
                    cost_price: convertCostPrice,
                    payment_mode: this.getPaymentTpe(order_by),
                    payment_tx_fee: convertTrxfeeToDollar.toFixed(5),
                    profit: finalAmountAfterDeduction.toFixed(5)
                };

                const createreport = this._accReportRepo.create(temp);
                await this._accReportRepo.save(createreport);
            }

            if (order_by == 4) {
                const payload = {
                    amount: parseFloat(amount).toFixed(2),
                    countryCode: createTransaction.mobileMoney.country_code,
                    network: createTransaction.mobileMoney.network
                }
                const convertTrxfeeToDollar = await this.convertAmount(payload);
                const convertTrxAmount: any = parseFloat(amount).toFixed(2);
                const convertCostPrice: any = convertor(parseFloat(convertor(findOne.cost_price)).toFixed(2));
                const finalAmountAfterDeduction: any = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);

                let coupDiscount: any = 0;
                if (coupon) {
                    coupDiscount = await this.getCouponDisc(coupon)
                }

                const temp: any = {
                    order_date: moment(createTopupOrder.created_at).format('DD MMMM YYYY'),
                    order_time: moment(createTopupOrder.created_at).format('HH:MM:SS'),
                    order_code: applied.data.order_no,
                    transaction_id: createTransaction.id,
                    customer_fullname: `${customer?.firstname} ${customer?.lastname}`,
                    customer_email: customer?.email,
                    iccId: iccid,
                    plan_name: findOne?.name,
                    data: findOne?.data,
                    validity: findOne.validity,
                    sale_price_inc_VAT: null,
                    sale_price_excl_VAT: findOne?.price,
                    coupon_code: coupon,
                    disc_from_coupon_code: coupDiscount,
                    amount_paid: convertTrxAmount,
                    cost_price: convertCostPrice,
                    payment_mode: this.getPaymentTpe(order_by),
                    payment_tx_fee: convertTrxfeeToDollar.toFixed(5),
                    profit: finalAmountAfterDeduction.toFixed(5)
                };

                const createreport = this._accReportRepo.create(temp);
                await this._accReportRepo.save(createreport);
            }

            return this.res.generateResponse(HttpStatus.OK, "your eSim recharged!", applied.data, req)

        } catch (error) {
            // console.log(error)
            return this.res.generateError(error, req)
        }

    }

    async getRechargeEsimOrderStatus(query: RechargeQueryDto, req: Request) {
        try {

            const { order_id, merchant_ref } = query;
            const customerDecode = this.jwt.decodeCustomer(req.headers.authorization);
            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customerDecode.id
                }
            });
            const order = await this._topupOrdersRepo.findOne({
                where: {
                    customer: {
                        id: customer.id
                    },
                    id: parseInt(order_id),
                    transaction: {
                        status: 'COMPLETED',
                        transaction_token: merchant_ref
                    }
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Recharge Completed!", order, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
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
                })

                console.log(details);


                if (details.length >= coupon.noOfUse) {
                    ret = false;
                }
            }

        }


        return ret;

    }

    async getPaymentStatus(order_id: string, req: Request, fromWebhook?:boolean) {

        try {

            const order = await this._topupOrdersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: parseInt(order_id),
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

                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please provide valid order id", null, req);

            }

            if (order.transaction.mobileMoney?.status == 'PENDING') {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please approved payment first!", null, req);
            }

            if (order.transaction?.status == 'COMPLETED') {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "This order already completed earlier!", null, req);
            }


            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: order.transaction.id })
                .execute()

            const payload = {
                iccid: order.iccid,
                plan_id: order.plan.package_id,
                email: order.customer.email,

            }
            const applied = await this._api.applyBundle(payload);


            if (applied.code != 200) {
                return this.res.generateResponse(HttpStatus.OK, applied.message, applied.data, req)
            }

            const cache = await this._paymentCacheRepo.findOne({
                where: {
                    tr_ref: order.transaction.transaction_token
                }
            })

            if (cache?.coupon_code) {
                const coupon = await this._couponRepo.findOne({
                    where: {
                        couponCode: cache.coupon_code
                    },
                    relations: {
                        details: true
                    }
                })
                if (coupon) {
                    const payload: CouponsDetails | any = {
                        coupon: coupon,
                        topup: order
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

                    await this._topupOrdersRepo.createQueryBuilder('Orders')
                        .update()
                        .set({
                            coupon_code: coupon.couponCode
                        })
                        .where("id = :id", { id: order.id })
                        .execute();
                }
            }

            await this._topupOrdersRepo.createQueryBuilder()
                .update()
                .set({
                    order_no: applied.data.order_no,
                    coupon_code: cache?.coupon_code ? cache.coupon_code : null
                })
                .where("id = :id", { id: order.id })
                .execute();

            const emailData = {
                to: order.customer.email,
                customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                order_no: applied.data.order_no,
                iccid: order.iccid,
                plan_name: order.plan.name,
                data: order.plan.data,
                validity: order.plan.validity,
                price: order.transaction.amount
            }
            await this._mail.sentRechargeEmail(emailData);

            console.log("your eSim recharged")
            this._socket.boardCastMsg('recharge-status', { topic: 'recharge-completed', order_id: order.id, message: "your eSim recharged!", success: true })
            return this.res.generateResponse(HttpStatus.OK, "your eSim recharged!", applied.data, req)

        } catch (error) {
            if (fromWebhook) {
                return {
                    error: true,
                    message: error.message,
                    status: HttpStatus.BAD_REQUEST
                }
            } 
            return this.res.generateError(error, req)
        }

    }

    async getPaymentStatusWallet(trans_id: string, req: Request) {

        try {

            const _customer_auth = this.jwt.decodeCustomer(req.headers.authorization);
            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: _customer_auth.id
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            const transaction = await this._transRepo.findOne({
                where: {
                    id: parseInt(trans_id),
                    deleted_at: IsNull(),
                    status: 'PENDING'
                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please provide valid transaction id", null, req)
            }

            if (transaction.mobileMoney.status != 'COMPLETED') {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please approved payment first from your side!", null, req)
            }



            // update customer wallet
            const _floatAmount = convertor(customer.wallet.wallet_balance)
            const updatedAmount = _floatAmount + parseFloat(transaction.amount);
            await this._customerWalletRepo.createQueryBuilder('CustomerWallet')
                .update()
                .set({
                    wallet_balance: updatedAmount
                })
                .where("id = :id", { id: customer.wallet.id })
                .execute()

            // create wallet history
            const walletHistory = this._customerWalletHisRepo.create({
                message: 'You have been topup your wallet',
                credit: convertor(transaction.amount),
                transaction: transaction,
                wallet_id: customer.wallet
            })

            await this._customerWalletHisRepo.save(walletHistory);

            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: transaction.id })
                .execute()
            return this.res.generateResponse(HttpStatus.OK, "Balance added successfully!", [], req)


        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getWalletStatusWithSocket(trans_id: number, req: Request) {
        try {
            console.log(trans_id);
            const customerWalletHistory = await this._customerWalletHisRepo.findOne({
                where: {
                    transaction: {
                        id: trans_id
                    }
                },
                relations: {
                    wallet_id: true,
                    transaction: true
                }
            });

            console.log(customerWalletHistory);

            // update customer wallet
            const _floatAmount = convertor(customerWalletHistory.wallet_id.wallet_balance)
            const updatedAmount = _floatAmount + parseFloat(customerWalletHistory.transaction.amount);
            await this._customerWalletRepo.createQueryBuilder('CustomerWallet')
                .update()
                .set({
                    wallet_balance: updatedAmount
                })
                .where("id = :id", { id: customerWalletHistory.wallet_id.id })
                .execute()

            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: trans_id })
                .execute()

            this._socket.boardCastMsg('wallet-status', { topic: 'topup-completed', transaction_id: trans_id, message: "Your Wallet Recharge Succefully!", success: true })

            return;
        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getPawaPayStatus(trans_id: string, req: Request) {

        try {

            const _customer_auth = this.jwt.decodeCustomer(req.headers.authorization);
            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: _customer_auth.id
                },
                relations: {
                    wallet: {
                        history: true
                    }
                }
            })

            const transaction = await this._transRepo.findOne({
                where: {
                    id: parseInt(trans_id),
                    deleted_at: IsNull(),
                    status: 'PENDING'
                },
                relations: {
                    mobileMoney: true
                }
            })

            if (!transaction) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please provide valid transaction id", null, req)
            }

            const response = await this._api.pawapayDepositeDetails(transaction.mobileMoney.tr_ref);

            if (response[0].status != 'COMPLETED') {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "please approved payment first from your side!", null, req)
            }

            // update customer wallet
            const _floatAmount = convertor(customer.wallet.wallet_balance)
            const updatedAmount = _floatAmount + parseFloat(transaction.amount);
            await this._customerWalletRepo.createQueryBuilder('CustomerWallet')
                .update()
                .set({
                    wallet_balance: updatedAmount
                })
                .where("id = :id", { id: customer.wallet.id })
                .execute()

            // create wallet history
            const walletHistory = this._customerWalletHisRepo.create({
                message: 'You have been topup your wallet',
                credit: convertor(transaction.amount),
                transaction: transaction,
                wallet_id: customer.wallet
            })

            await this._customerWalletHisRepo.save(walletHistory);

            await this._transRepo.createQueryBuilder('Transactions')
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: transaction.id })
                .execute()

            return this.res.generateResponse(HttpStatus.OK, "Balance added successfully!", [], req)


        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAlleSimList(req: Request) {
        try {

            const customer: any = this.jwt.decodeCustomer(req.headers.authorization);

            const orderIccidList = await this._eOrdersRepo.find({
                where: {
                    deleted_at: IsNull(),
                    status: 'COMPLETED',
                    customer: {
                        id: customer.id
                    }
                },
                select: {
                    iccid: true
                }
            })

            const activatedIccidList = await this._activatedSimsRepo.find({
                where: {
                    deleted_at: IsNull(),
                    customer: {
                        id: customer.id
                    }
                }
            })

            const data = [...orderIccidList, ...activatedIccidList]

            return this.res.generateResponse(HttpStatus.OK, "Iccid List", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getEsimDetailsByIccid(iccid: string, req: Request) {
        try {

            const customer = this.jwt.decodeCustomer(req.headers.authorization);

            let isValidIccidInOrder: any = await this._eOrdersRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    iccid: iccid,
                    customer: {
                        id: customer.id
                    }
                }
            })

            let isValidIccidInActivate = await this._activatedSimsRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    customer: {
                        id: customer.id
                    }
                }
            })

            if (!isValidIccidInActivate && !isValidIccidInOrder) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Iccid is Not valid!", null, req)
            }

            const response = await this._api.getEsimDetails(iccid);

            return this.res.generateResponse(HttpStatus.OK, "Esim Details", response.data, req);


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async rechargeEsimWithFWCard(body: RechargeEsimFWCardDto, req: Request) {
        try {

            const { iccid, plan_id, order_by, coupon, ...card } = body;
            const customerDecode = this.jwt.decodeCustomer(req.headers.authorization);

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customerDecode.id
                }
            })

            const findOne = await this._planstRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan not found!", null, req);
            }

            if (order_by != 2) {
                throw new HttpException("Invalid Payment Gateway", HttpStatus.BAD_REQUEST);
            }

            // here convert string to number:
            let amount: any = convertor(findOne.price);

            // validate coupon if exist
            if (coupon) {
                const isValidCoupon: any = await this.validateCoupon(coupon);

                if (!isValidCoupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code or may be expired!", null, req)
                }

                const { discount, isFixed } = isValidCoupon;

                let planPrice = parseFloat(findOne.price)

                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                } else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
                amount = amount.toFixed(2)
            }



            let token = this._general.generateTransactionRef(true);

            const intentPayload = {
                token,
                amount: amount,
                customer_email: customer.email,
                ...card,
            }

            const fwCardIntent = await this._general.createFwCardIntent(intentPayload);

            console.log(fwCardIntent);

            if (fwCardIntent.status != 'success') {
                throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR)
            }



            if (fwCardIntent.meta.authorization.mode == 'redirect') {

                // set paymentCache for later used
                const paymentCachePayload = {
                    coupon_code: coupon ? coupon : null,
                    tr_ref: token,
                    fw_ref: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.flw_ref : null,
                    tr_id: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.id : null
                }

                const createCache = this._paymentCacheRepo.create(paymentCachePayload);
                await this._paymentCacheRepo.save(createCache);

                // set transaction
                const transactionPayload: any = {
                    transaction_token: token,
                    note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                    status: 'PENDING',
                    amount: amount
                };

                const createTrans: any = this._transRepo.create(transactionPayload);
                await this._transRepo.save(createTrans);


                const topupPayload = {
                    iccid: iccid,
                    plan: findOne,
                    customer: customer,
                    transaction: createTrans,
                    order_by: order_by
                }

                const topup = this._topupOrdersRepo.create(topupPayload);
                await this._topupOrdersRepo.save(topup);

                const data = {
                    mode: fwCardIntent.meta.authorization.mode,
                    isRedirect: true,
                    redirect_url: fwCardIntent.meta.authorization.redirect,
                    trans_id: createTrans.id,
                    trans_token: token,
                    order_id: topup.id
                }

                return this.res.generateResponse(HttpStatus.OK, "Please approved payment", data, req);

            } else {

                const data = {
                    mode: fwCardIntent.meta.authorization.mode,
                    isRedirect: false,
                }

                return this.res.generateResponse(HttpStatus.OK, "Please approved payment", data, req);

            }

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async rechargeEsimWithFWCardAuthorize(body: RechargeEsimFWCardAuthorizeDto, req: Request) {
        try {

            const { iccid, plan_id, order_by, coupon, authorization, ...card } = body;
            const customerDecode = this.jwt.decodeCustomer(req.headers.authorization);

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customerDecode.id
                }
            })

            const findOne = await this._planstRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan not found!", null, req);
            }

            if (order_by != 2) {
                throw new HttpException("Invalid Payment Gateway", HttpStatus.BAD_REQUEST);
            }

            // here convert string to number:
            let amount: any = convertor(findOne.price);

            // validate coupon if exist
            if (coupon) {
                const isValidCoupon: any = await this.validateCoupon(coupon);

                if (!isValidCoupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code or may be expired!", null, req)
                }

                const { discount, isFixed } = isValidCoupon;

                let planPrice = parseFloat(findOne.price)

                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                } else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
                amount = amount.toFixed(2)
            }



            let token = this._general.generateTransactionRef(true);

            const intentPayload = {
                token,
                amount: amount,
                customer_email: customer.email,
                ...card,
                authorization
            }

            const fwCardIntent = await this._general.authorizedFWCard(intentPayload);

            if (fwCardIntent.status != 'success') {
                throw new HttpException("Something went wrong!", HttpStatus.INTERNAL_SERVER_ERROR)
            }


            // set paymentCache for later used
            const paymentCachePayload = {
                coupon_code: coupon ? coupon : null,
                tr_ref: token,
                fw_ref: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.flw_ref : null,
                tr_id: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.data.id : null
            }

            const createCache = this._paymentCacheRepo.create(paymentCachePayload);
            await this._paymentCacheRepo.save(createCache);

            // set transaction
            const transactionPayload: any = {
                transaction_token: token,
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                status: 'PENDING',
                amount: amount
            };

            const createTrans: any = this._transRepo.create(transactionPayload);
            await this._transRepo.save(createTrans);


            const topupPayload = {
                iccid: iccid,
                plan: findOne,
                customer: customer,
                transaction: createTrans,
                order_by: order_by
            }

            const topup = this._topupOrdersRepo.create(topupPayload);
            await this._topupOrdersRepo.save(topup);

            const data = {
                mode: fwCardIntent.meta.authorization.mode,
                isRedirect: fwCardIntent.meta.authorization.mode == 'redirect' ? true : false,
                redirect_url: fwCardIntent.meta.authorization.mode == 'redirect' ? fwCardIntent.meta.authorization.redirect : null,
                trans_id: createTrans.id,
                trans_token: token,
                order_id: topup.id
            }

            return this.res.generateResponse(HttpStatus.OK, "Please approved payment", data, req);


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async rechargeEsimWithFWCardValidate(body: ValidateFWRechargeDto, req: Request) {
        try {

            const { otp_code, transaction_id } = body;

            const order = await this._topupOrdersRepo.findOne({
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
            return this.res.generateError(error, req)
        }
    }

    async rechargeEsimWithDPO(body: RechargeEsimDPODto, req: Request) {
        try {

            const { iccid, plan_id, order_by, coupon, } = body;
            const customerDecode = this.jwt.decodeCustomer(req.headers.authorization);

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: customerDecode.id
                }
            })

            const findOne = await this._planstRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: plan_id
                }
            })

            if (!findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan not found!", null, req);
            }

            if (order_by != 6) {
                throw new HttpException("Invalid Payment Gateway", HttpStatus.BAD_REQUEST);
            }

            // here convert string to number:
            let amount: any = convertor(findOne.price);

            // validate coupon if exist
            if (coupon) {
                const isValidCoupon: any = await this.validateCoupon(coupon);

                if (!isValidCoupon) {
                    return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Invalid coupon code or may be expired!", null, req)
                }

                const { discount, isFixed } = isValidCoupon;

                let planPrice = parseFloat(findOne.price)

                if (!isFixed) {
                    let discountAmount = planPrice / 100 * parseFloat(discount);
                    amount = amount - discountAmount;
                    if (amount <= 0) {
                        amount = 0;
                    }
                } else {
                    amount = amount - parseFloat(discount);
                    if (amount <= 0) {
                        amount = 0;
                    }
                }
                amount = amount.toFixed(2);
            }


            // set transaction
            const transactionPayload: any = {
                transaction_token: "DPO_NULL",
                note: `${process.env.API_NAME} customer: (${customer.email}) topup his/her ${iccid}`,
                status: 'PENDING',
                amount: amount
            };

            const createTrans: any = this._transRepo.create(transactionPayload);
            await this._transRepo.save(createTrans);

            const payload = {
                CompanyToken: process.env.DPO_COMPANY_TOKEN,
                Request: 'createToken',
                Transaction: {
                    PaymentAmount: amount,
                    PaymentCurrency: 'USD',
                    RedirectURL: `${process.env.DPO_REDIRECT_URL}?tran_id=${createTrans.id}&type=TOPUP`,
                    BackURL: process.env.DPO_REDIRECT_URL,
                    customerEmail: customer.email,
                    customerFirstName: customer.firstname,
                    customerLastName: customer.lastname
                },
                Services: {
                    Service: {
                        ServiceType: process.env.DPO_SERVICE_TYPE,
                        ServiceDescription: 'purchase ' + findOne.name,
                        ServiceDate: moment().format('YYYY/MM/DD HH:MM')
                    }
                }
            }

            const tokenResponse: any = await this._api.dpoCreateToken(payload);

            let token: string = `DPO_${tokenResponse.API3G.TransToken._text}`;

            // set paymentCache for later used
            const paymentCachePayload = {
                coupon_code: coupon ? coupon : null,
                tr_ref: token,
            }

            const createCache = this._paymentCacheRepo.create(paymentCachePayload);
            await this._paymentCacheRepo.save(createCache);

            // // update transaction token
            await this._transRepo.createQueryBuilder()
                .update()
                .set({
                    transaction_token: token
                })
                .where("id = :id", { id: createTrans.id })
                .execute()


            const topupPayload = {
                iccid: iccid,
                plan: findOne,
                customer: customer,
                transaction: createTrans,
                order_by: order_by
            }

            const topup = this._topupOrdersRepo.create(topupPayload);
            await this._topupOrdersRepo.save(topup);

            const data = {
                trans_id: createTrans.id,
                trans_token: token,
                order_id: topup.id,
                redirect: true,
                redirect_url: `${process.env.DPO_PAYMENT_URL}${tokenResponse.API3G.TransToken._text}`
            }

            return this.res.generateResponse(HttpStatus.OK, "We are waiting for your payment approval", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async verifyDPOPaymentForRecharge(order_id: string, req: Request) {
        try {

            const order = await this._topupOrdersRepo.findOne({
                where: {
                    id: parseInt(order_id),
                    transaction: {
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

            if (!order) {
                this._socket.boardCastMsg('recharge-status', { topic: 'check-mobile-payment', order_id: order.id, message: "We are sorry your mobile payment is failed due to some reason!", success: false })
                throw new HttpException("Invalid Order ID provided", HttpStatus.BAD_REQUEST);
            }

            const pureToken = order.transaction.transaction_token.split('_')[1]
            const mode = order.transaction.transaction_token.split('_')[2];

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
                this._socket.boardCastMsg('recharge-status', { topic: 'check-mobile-payment', order_id: order.id, message: "We are sorry your mobile payment is failed due to some reason!", success: false })
                throw new HttpException("In-valid Order no provided!", HttpStatus.BAD_REQUEST);

            } else {


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

                const payload = {
                    iccid: order.iccid,
                    plan_id: order.plan.package_id,
                    email: order.customer.email,

                }
                const applied = await this._api.applyBundle(payload);


                if (applied.code != 200) {
                    return this.res.generateResponse(HttpStatus.OK, applied.message, applied.data, req)
                }

                const cache = await this._paymentCacheRepo.findOne({
                    where: {
                        tr_ref: order.transaction.transaction_token
                    }
                })

                if (cache.coupon_code) {
                    const coupon = await this._couponRepo.findOne({
                        where: {
                            couponCode: cache.coupon_code
                        },
                        relations: {
                            details: true
                        }
                    })
                    if (coupon) {
                        const payload: CouponsDetails | any = {
                            coupon: coupon,
                            topup: order
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

                        await this._topupOrdersRepo.createQueryBuilder('Orders')
                            .update()
                            .set({
                                coupon_code: coupon.couponCode
                            })
                            .where("id = :id", { id: order.id })
                            .execute();
                    }
                }

                await this._topupOrdersRepo.createQueryBuilder()
                    .update()
                    .set({
                        order_no: applied.data.order_no,
                        coupon_code: cache?.coupon_code ? cache.coupon_code : null
                    })
                    .where("id = :id", { id: order.id })
                    .execute();

                const emailData = {
                    to: order.customer.email,
                    customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
                    order_no: applied.data.order_no,
                    iccid: order.iccid,
                    plan_name: order.plan.name,
                    data: order.plan.data,
                    validity: order.plan.validity,
                    price: order.transaction.amount
                }
                await this._mail.sentRechargeEmail(emailData);

                console.log("your eSim recharged")
                this._socket.boardCastMsg('recharge-status', { topic: 'recharge-completed', order_id: order.id, message: "your eSim recharged!", success: true })

                return this.res.generateResponse(HttpStatus.OK, "your eSim has been recharged!", applied.data, req)

            }



        } catch (error) {
            return this.res.generateError(error, req)
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
