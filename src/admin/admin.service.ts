import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { Plans } from 'src/entities/plans.entites';
import { IsNull, Repository } from 'typeorm';
import { EsimDetailsQuery, PurchasePlanDto } from './admin.dto';
import { Request } from 'express';
import { ResponseService } from 'src/shared/service/response.service';
import { ApiService } from 'src/shared/service/api.service';
import { GeneralService } from 'src/shared/service/general.service';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { Transactions } from 'src/entities/transactions.entity';
import * as moment from 'moment';
import { TopupOrders } from 'src/entities/topup-orders.entity';

@Injectable()
export class AdminService {

    constructor(
        @InjectRepository(Customers) private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(CustomerWallet) private readonly _customerWalletRepo: Repository<CustomerWallet>,
        @InjectRepository(CustomerWalletHistory) private readonly _customerWalletHisRepo: Repository<CustomerWalletHistory>,
        @InjectRepository(Plans) private readonly _plansRepo: Repository<Plans>,
        @InjectRepository(EsimOrders) private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(TopupOrders) private readonly _topupOrdersRepo: Repository<TopupOrders>,
        @InjectRepository(Transactions) private readonly _transRepo: Repository<Transactions>,
        @Inject("RESPONSE-SERVICE") private _res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        private _mail: MailService,
    ){}

    // PURCHASE ESIM BY ADMIN START


    async purchaseEsimByAdmin(body: PurchasePlanDto, req: Request){
        try {
            
            const { plan_id, customer_email, customer_firstname, customer_lastname } = body;

            const customerPayload:CustomerDetials = {
                firstname: customer_firstname,
                lastname: customer_lastname,
                email: customer_email
            }

            const customer = await this.createCustomerIfNotExist(customerPayload);

            const plan = await this._plansRepo.findOne({
                where: {
                    id: plan_id,
                    deleted_at: IsNull()
                },
                relations: {
                    countires: true
                }
            })

            if(!plan) throw new HttpException("Invalid plan id", HttpStatus.BAD_REQUEST);

            const requestOrder = {
                plan_id: plan.package_id
            }

            const requestedOrder = await this._api.requestProductOrder(requestOrder);

            // confirm order on SM
            const confirmOrderPayload = {
                order_id: requestedOrder.data.order_id
            };
            const {data} = await this._api.completeOrder(confirmOrderPayload);

            const transaction = this._transRepo.create({
                transaction_token: 'ADMIN-ORDER',
                note: `Admin purchase esim for ${customer.email}`,
                status: 'COMPLETED',
                amount: plan.price,
                mobileMoney: null
            })
            await this._transRepo.save(transaction)

            const order = this._ordersRepo.create({
                status: 'COMPLETED',
                order_code: data.order_id,
                couponCode: null,
                device_name: null,
                device_os: null,
                order_by: 0,
                iccid: data.iccid,
                qr_code: data.qr_code,
                qrcode_url: data.qrcode_url,
                apn: data.apn,
                data_roaming: data.data_roaming,
                customer: customer,
                plan: plan,
                transaction: transaction
            })
            await this._ordersRepo.save(order)

            // send order mail to customer
        let emailData = {
            to: order.customer.email,
            customer_name: `${order.customer.firstname} ${order.customer.lastname}`,
            order_id: order.order_code,
            order_date: moment(order.created_at).format('MMMM DD YYYY'),
            iccid: order.iccid,
            apn: order.apn,
            dataRoaming: order.data_roaming,
            paymentType: 'ADMIN-PURCHASE',
            email: order.customer.email,
            packageData: order.plan.data,
            packageValidity: order.plan.validity,
            planName: order.plan.name.includes('GB') ? order.plan.name : `${order.plan.name} ${order.plan.data}GB-${order.plan.validity}DAYS`,
            payment: order.transaction.amount,
            os: order.device_os,
            device: order.device_name,
            iosAddress: this.spliteCode(order?.qr_code)[1],
            iosURL: this.spliteCode(order?.qr_code)[2],
            qrCodeString: order.qr_code,
            qr_url: order.qrcode_url,
            affiliteUrl: null,
            affiliate_dashboard_url: null
        };
        await this._mail.sendOrderEmail(emailData);

        const resData = {
            ...order,
            customer: order.customer,
            device_os: order.device_os,
            device_name: order.device_name,
            order_date: order.created_at,
            plan: {
                ...order.plan,
                price: order.transaction.amount

            },
            affiliteUrl: null,
            affiliate_dashboard_url: null
        };

        return this._res.generateResponse(HttpStatus.OK, "Order Purchase", resData, req);



        } catch (error) {
            this._res.generateError(error,req);
        }
    }

    async getEsimDetails(query: EsimDetailsQuery, req: Request){
        try {
            
            const { iccid, type, id } = query;

            const {data} = await this._api.getEsimDetails(iccid);
console.log(data);
            if (type == 'ORDER') {
                
                const order = await this._ordersRepo.findOne({
                    where: {
                        id: parseInt(id)
                    },
                    relations: {
                        plan: true,
                        transaction: true,
                        customer: true
                    }
                })

                const topupHistory = await this._topupOrdersRepo.find({
                    where: {
                        iccid: order.iccid,
                        customer: {
                            id: order.customer.id
                        }
                    },
                    relations: {
                        plan: true
                    }
                })

                const response = {
                    orderType: 'esim',
                    order: {
                        ...order
                    },
                    topupHistory: [
                        ...topupHistory
                    ],
                    active_bundle: {
                        ...data.active_bundle
                    }
                }

                return this._res.generateResponse(HttpStatus.OK, "Esim Details", response, req);

            }

            return 

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }


    // PURCHASE ESIM BY ADMIN END


    // ****GENERAL-FUNCTIONS****

    private async createCustomerIfNotExist(_customer: CustomerDetials): Promise<Customers>{
        try {
            
            const {firstname, lastname, email} = _customer;
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
                return customer;
            }

            const tempPass = `${firstname.trim()}123456`

            const salt = await bcrypt.genSalt(10);
            const hashPass = await bcrypt.hash(tempPass, salt);

            const payLoad: Customers | any = {
                firstname: firstname,
                lastname: lastname,
                email: email.trim(),
                password: hashPass
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


            return createdCustomer

        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private spliteCode(qr_code: string) {

        console.log(qr_code);
        let splitedCode = qr_code.split('$');
        // console.log(splitedCode);
        return splitedCode;
    }

}

type CustomerDetials = {
    firstname: string,
    lastname: string,
    email: string
}
