import { CreateTokenParams } from './../payments/payments.dto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MobileMoneyTransactions } from 'src/entities/mobile_money_transactions.entity';
import { ApiService } from 'src/shared/service/api.service';
import { GeneralService } from 'src/shared/service/general.service';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Not, Repository } from 'typeorm';
import { FlutterwavesVerificationDto } from './web-hooks.dto';
import { Request } from 'express';
import { SocketGateway } from 'src/socket/socket.gateway';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { OrdersService } from 'src/orders/orders.service';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { CustomerService } from 'src/customer/customer.service';
import { Transactions } from 'src/entities/transactions.entity';
import { Plans } from 'src/entities/plans.entites';
import * as xmljs from 'xml-js';
import { PawaPayRefunds } from 'src/entities/pawaPayRefunds.entity';
import { RefundActivities } from 'src/entities/refundActivities.entity';
import { PurchaseEsimService } from 'src/purchase-esim/purchase-esim.service';
import { RechargeEsimService } from 'src/recharge-esim/recharge-esim.service';
import { RechargeCustomerWalletService } from 'src/recharge-customer-wallet/recharge-customer-wallet.service';

@Injectable()
export class WebHooksService {

    constructor(
        @InjectRepository(MobileMoneyTransactions)
        private readonly _MobileMoneyRepo: Repository<MobileMoneyTransactions>,
        @InjectRepository(EsimOrders)
        private readonly _orderRepo: Repository<EsimOrders>,
        @InjectRepository(Plans)
        private readonly _planRepo: Repository<Plans>,
        @InjectRepository(TopupOrders)
        private readonly _TopupOrderRepo: Repository<TopupOrders>,
        @InjectRepository(Transactions)
        private readonly _transRepo: Repository<Transactions>,
        @InjectRepository(PawaPayRefunds) private readonly _pwpRefundRepo: Repository<PawaPayRefunds>,
        @InjectRepository(RefundActivities) private _refundRepo: Repository<RefundActivities>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
        @Inject('ORDERS-SERVICE') private _orders: OrdersService,
        @Inject('PURCHASE-ESIM-SERIVE') private _purchase: PurchaseEsimService,
        @Inject('RECHARGE-SERVICE') private _recharge: RechargeEsimService,
        @Inject('WALLET-SERVICE') private _wallet: RechargeCustomerWalletService,
        @Inject("CUSTOMER-SERVICE") private _customers: CustomerService,
        private _socket: SocketGateway
    ) { }

    async flutterwavePaymentVerfication(body: FlutterwavesVerificationDto, req: Request) {

        try {
            console.log("========================= FULLTER-WAVE==============================");
            console.log(body)
            console.log("========================= FULLTER-WAVE==============================");

            const { event, data } = body;

            // look for order an esim with MM:
            await this.orderAnEsim(event, data, req);

            // 

            // look for recharge an esim:
            await this.placeTopupOrders(event, data, req);

            // look for recharge customer wallet:
            await this.topupWallet(event, data, req);


            return this.res.generateResponse(HttpStatus.OK, "We have recieved your notification", [], req);


        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async fultterwavePaymentVerificationMultipleOrder(body: FlutterwavesVerificationDto, req: Request) {

        try {

            console.log("========================= FULLTER-WAVE==============================");
            console.log(body)
            console.log("========================= FULLTER-WAVE==============================");

            const { event, data } = body;

            // look for order an esim:
            await this.orderMulitpleEsim(event, data, req);

            // look for recharge an esim:
            await this.placeTopupOrders(event, data, req);

            // look for recharge customer wallet:
            await this.topupWallet(event, data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async pawapayPaymentVerfication(body: any, req: Request) {

        try {
            console.log(body);
            const { depositId, status } = body;

            let event: any = status == 'COMPLETED' ? "charge.completed" : "charge.failed";
            let data: any = {
                tx_ref: depositId
            };

            // look for order an esim:
            await this.orderAnEsim(event, data, req);

            // look for recharge an esim:
            await this.placeTopupOrders(event, data, req);

            // look for recharge customer wallet:
            await this.topupWallet(event, data, req);


            return this.res.generateResponse(HttpStatus.OK, "We have recieved your notification", [], req);

        } catch (error) {

            return this.res.generateError(error, req);

        }

    }

    async pawapayRefundVerfication(body: any, req: Request) {
        try {

            const { refundId } = body;

            const refundDetails = await this._api.checkPawaPayRefundStatus(refundId);
            console.log(refundDetails);

            const pawapayRefund = await this._pwpRefundRepo.findOne({
                where: {
                    refund_id: refundId
                },
                relations: {
                    order: true
                }
            })

            const refundActivities = await this._refundRepo.findOne({
                where: {
                    order: {
                        id: pawapayRefund.order.id
                    }
                }
            })

            if (refundDetails[0].status != "COMPLETED") {


                // update pawa refund logs
                await this._pwpRefundRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'FALLED',
                    })
                    .where("id = :id", { id: pawapayRefund.id })
                    .execute()

                // update refund logs
                await this._refundRepo.createQueryBuilder()
                    .update()
                    .set({
                        status: 'FALLED',
                        note: "Refund rejected by Pawa Pay"
                    })
                    .where("id = :id", { id: refundActivities.id })
                    .execute()

                return this.res.generateResponse(HttpStatus.OK, "OK", null, req);
            }

            // update pawa refund logs
            await this._pwpRefundRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED'
                })
                .where("id = :id", { id: pawapayRefund.id })
                .execute()

            // update refund logs
            await this._refundRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'COMPLETED',
                    note: "Refund Accepted by Pawa Pay"
                })
                .where("id = :id", { id: refundActivities.id })
                .execute()

            // update order status
            await this._orderRepo.createQueryBuilder()
                .update()
                .set({
                    status: 'REFUNDED'
                })
                .where("id = :id", { id: pawapayRefund.order.id })
                .execute()

            return this.res.generateResponse(HttpStatus.OK, "OK", null, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async pesaPayPaymentVerification(body: any, req: Request) {

        try {

            const { OrderTrackingId } = body;

            // return await this._api.getTransactionStatus(OrderTrackingId);

            const { status_code, merchant_reference: transaction_token } = await this._api.getTransactionStatus(OrderTrackingId);

            if (status_code == 1) {

                this.orderEsimByPesaPal(transaction_token, req);
                this.topupOrderPesaPal(transaction_token, req);
                this.walletTopupPesaPal(transaction_token, req);

            }
            // else {

            //     const trans = await this._transRepo.findOne({
            //         where: {
            //             transaction_token: transaction_token
            //         }
            //     })

            //     await this._transRepo.createQueryBuilder()
            //         .update()
            //         .set({
            //             status: 'FAILED',

            //         })
            //         .where("deleted_at IS NULL AND id = :id", { id: trans.id })
            //         .execute()

            //     this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: trans.id, message: "We are sorry, your payment has been rejected by system!", success: true })


            // }

        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async topupOrderPesaPal(token: string, req: Request) {
        try {

            const order = await this._TopupOrderRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    transaction: {
                        transaction_token: token,
                        status: 'PENDING'
                    },
                },
                relations: {
                    transaction: true
                }
            })
            if (order) {

                this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.id, order_id: order.id, message: "We have received your payment!", success: true })
                const data: any = await this._customers.getPaymentStatus(`${order.id}`, req, true);
                if (data.error) {
                    this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.id, order_id: order.id, message: data.message, success: false })
                }

            }

        } catch (error) {
            console.log(error);
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    async orderEsimByPesaPal(token: string, req: Request) {

        const order = await this._orderRepo.findOne({
            where: {
                deleted_at: IsNull(),
                transaction: {
                    transaction_token: token,
                    status: 'PENDING'
                },
            },
            relations: {
                transaction: true
            }
        })
        if (order) {

            this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.transaction.id, message: "We have received your payment!", success: true })
            this._orders.getMobilePaymentStatus(`${order.transaction.id}`, req);

        }
    }

    async walletTopupPesaPal(token: string, req: Request) {
        try {

            const transaction = await this._transRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    transaction_token: token,
                    status: 'PENDING'
                }
            })

            if (!transaction) {
                return
            }

            const order = await this._orderRepo.findOne({
                where: {
                    transaction: {
                        id: transaction.id
                    }
                }
            })

            const topup = await this._TopupOrderRepo.findOne({
                where: {
                    transaction: {
                        id: transaction.id
                    }
                }
            })

            if (transaction && !order && !topup) {

                this._socket.boardCastMsg('wallet-status', { topic: 'check-mobile-payment', transaction_id: transaction.id, message: "We have received your payment!", success: true })
                this._customers.getWalletStatusWithSocket(transaction.id, req);

            }

        } catch (error) {
            console.log(error);
        }
    }

    async topupWallet(event: any, data: any, req: Request) {

        console.log(data);
        const transaction = await this._transRepo.findOne({
            where: {
                deleted_at: IsNull(),
                mobileMoney: {
                    tr_ref: data.tx_ref,
                    deleted_at: IsNull(),
                    status: 'PENDING'
                }
            },
            relations: {

            }
        })

        if (!transaction) {
            return
        }

        const order = await this._orderRepo.findOne({
            where: {
                transaction: {
                    id: transaction.id
                }
            }
        })

        const topup = await this._TopupOrderRepo.findOne({
            where: {
                transaction: {
                    id: transaction.id
                }
            }
        })

        console.log(transaction);

        if (transaction && !order && !topup) {

            let status = 'FAILED'
            if (event == 'charge.completed') {
                status = 'COMPLETED';

                await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                    .update()
                    .set({
                        status: status
                    })
                    .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                    .execute();

                this._socket.boardCastMsg('wallet-status', { topic: 'check-mobile-payment', transaction_id: transaction.id, message: "We have received your payment!", success: true })

                console.log(transaction);

                this._customers.getWalletStatusWithSocket(transaction.id, req);
            } else {

                await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                    .update()
                    .set({
                        status: status
                    })
                    .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                    .execute();

                this._socket.boardCastMsg('wallet-status', { topic: 'check-mobile-payment', transaction_id: transaction.id, message: "We are sorry your mobile payment is failed due to some reason!", success: false })

            }

        }

    }

    async placeTopupOrders(event: any, data: any, req: Request) {


        // console.log(req.originalUrl);

        const order = await this._TopupOrderRepo.findOne({
            where: {
                transaction: {
                    transaction_token: data.tx_ref,
                }
            },
            relations: {
                transaction: true
            }
        });

        if (order) {


            let status = 'FAILED'
            if (event == 'charge.completed') {
                status = 'COMPLETED';

                if (order.transaction.mobileMoney) {
                    await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                        .update()
                        .set({
                            status: status
                        })
                        .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                        .execute();
                }

                this._socket.boardCastMsg('recharge-status', { topic: 'check-mobile-payment', order_id: order.id, message: "We have received your payment!", success: true })

                this._customers.getPaymentStatus(`${order.id}`, req);
            } else {

                await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                    .update()
                    .set({
                        status: status
                    })
                    .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                    .execute();

                this._socket.boardCastMsg('recharge-status', { topic: 'check-mobile-payment', order_id: order.id, message: "We are sorry your mobile payment is failed due to some reason!", success: false })

            }

        }
    }

    async orderMulitpleEsim(event: any, data: any, req: Request) {

        console.log("EVENT ============ ", event);

        const { tx_ref } = data;

        const requestedOrders = await this._orderRepo.find({
            where: {
                transaction: {
                    mobileMoney: {
                        tr_ref: tx_ref,
                        deleted_at: IsNull(),
                        status: 'PENDING'
                    }
                }
            },
            relations: {
                transaction: true,
                plan: true
            }
        })

        // console.log(requestedOrders);

        if (requestedOrders.length) {

            if (event == 'charge.completed') {

                this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', tr_ref: data.tx_ref, message: "We have received your payment!", success: true })

                const plans: Plans[] = requestedOrders.map((ele) => {
                    return ele.plan
                })

                const amount = await this._orders.calculatePlansAmount(plans, requestedOrders[0].couponCode, req);

                const completedOrdersData: any[] = []

                for (const order of requestedOrders) {

                    completedOrdersData.push(await this._orders.completedAllOrdersRequest(order.order_code, amount, req))

                    this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', tr_ref: data.tx_ref, message: `your order ${(completedOrdersData.length * 100 / requestedOrders.length).toFixed(0)}% completed`, success: true })
                }

                this._socket.boardCastMsg('order-status', { topic: 'order-completed', tr_ref: data.tx_ref, message: "your order has been completed!", success: true, data: completedOrdersData })


            } else {

                await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                    .update()
                    .set({
                        status: "FAILED"
                    })
                    .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                    .execute();

                this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', tr_ref: data.tx_ref, message: "We are sorry your mobile payment is failed due to some reason!", success: false })

            }

        }

    }

    async orderAnEsim(event: any, data: any, req: Request) {
        const order = await this._orderRepo.findOne({
            where: {
                transaction: {
                    transaction_token: data.tx_ref
                    // mobileMoney: {
                    //     tr_ref: data.tx_ref,
                    //     deleted_at: IsNull(),
                    //     status: 'PENDING'
                    // }
                }
            },
            relations: {
                transaction: true
            }
        })

        if (order) {

            let status = 'FAILED'
            if (event == 'charge.completed') {
                status = 'COMPLETED';

                if (order.transaction.mobileMoney) {
                    await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                        .update()
                        .set({
                            status: status
                        })
                        .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                        .execute();
                }



                this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.transaction.id, message: "We have received your payment!", success: true })
                this._orders.getMobilePaymentStatus(`${order.transaction.id}`, req);
            } else {

                await this._MobileMoneyRepo.createQueryBuilder('MobileMoneyTransactions')
                    .update()
                    .set({
                        status: status
                    })
                    .where("tr_ref = :tr_ref", { tr_ref: data.tx_ref })
                    .execute();

                this._socket.boardCastMsg('order-status', { topic: 'check-mobile-payment', trans_id: order.transaction.id, message: "We are sorry your mobile payment is failed due to some reason!", success: false })

            }

        }


    }

    async dpoWebhook(body: any, req: Request) {
        try {

            let rawBody: any = ''
            req.on('data', (chunks) => {
                rawBody += chunks
            });
            req.on('end', () => {
                console.log(rawBody);
                const Body: any = xmljs.xml2js(rawBody, { compact: true, ignoreComment: true, alwaysChildren: true })

                const data = {
                    result: Body.API3G.Result._text,
                    TransactionToken: Body.API3G.TransactionToken._text
                }

                console.log(data);

                this.processDPOpayment(data, req);
            })


            const payload = {
                Response: 'OK'
            }
            const xmlRESHead = `<?xml version="1.0" encoding="utf-8"?>\n`;
            const xmlRESCore = xmljs.js2xml({ API3G: payload }, { compact: true, ignoreComment: true, spaces: 4 })
            const xmlRES = `${xmlRESHead}${xmlRESCore}`;

            return xmlRES;

        } catch (error) {
            console.log(error);
        }
    }

    async processDPOpayment(data: { result: string, TransactionToken: string }, req: Request) {
        try {

            if (data.result == '000') {
                const order = await this._orderRepo.findOne({
                    where: {
                        status: 'PENDING',
                        transaction: {
                            transaction_token: `DPO_${data.TransactionToken}`
                        }
                    },

                })

                const topup = await this._TopupOrderRepo.findOne({
                    where: {
                        transaction: {
                            transaction_token: `DPO_${data.TransactionToken}`
                        }
                    },
                    relations: {
                        transaction: true
                    }
                })

                console.log(topup);

                if (order) {
                    this._orders.verifyAndGetOrderDetails(`${order.order_code}`, req)
                }

                if (topup) {
                    console.log("run topup");
                    this._customers.verifyDPOPaymentForRecharge(`${topup.id}`, req)
                }
            }

        } catch (error) {
            this.res.generateError(error, req)
        }
    }

    async safaricomValidation(body: any, req: Request) {

    }

    async safaricomConfirmation(body: any, req: Request) {

    }

    // payment webhooks V2 calls
    async flutterwavePaymentV2(body: any, req: Request) {
        try {

            if (body.event != 'charge.completed') {
                this._socket.sendTransactionUpdates(body.data.tx_ref, { topic: 'transaction-updates', data: { sucess: false, message: 'your transaction has been failed due to some reason' } });
            } else {

                const order = await this._orderRepo.findOne(
                    {
                        where: {
                            transaction: { transaction_token: body.data.tx_ref }
                        },
                        relations: {
                            customer: true,
                            plan: true,
                            transaction: {
                                mobileMoney: true
                            }
                        }
                    },
                )
                if (order) this._purchase.flutterwaveWebhookOrderComplete(order, body.data.tx_ref);

                const topup = await this._TopupOrderRepo.findOne({
                    where: {
                        transaction: { transaction_token: body.data.tx_ref, status: 'PENDING' }
                    },
                    relations: {
                        customer: true,
                        plan: true,
                        transaction: {
                            mobileMoney: true
                        }
                    }
                })

                if (topup) this._recharge.flutterwaveWebhookRechargeComplete(topup, body.data.tx_ref);

                const transaction = await this._transRepo.findOne({
                    where: {
                        status: 'PENDING',
                        transaction_token: body.data.tx_ref
                    },
                    relations: {
                        mobileMoney: true
                    }
                })

                if((!order && !topup) && transaction) this._wallet.flutterWaveWebhookWalletRechargeComplete(transaction, body.data.tx_ref);


            }

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async pawaPayPaymentV2(body: any, req: Request) {
        try {

            const { depositId, status } = body;

            if (status != 'COMPLETED') {
                this._socket.sendTransactionUpdates(depositId, { topic: 'order-updates', data: { sucess: false, message: 'your transaction has been failed due to some reason' } });
            } else {

                const order = await this._orderRepo.findOne(
                    {
                        where: {
                            transaction: { transaction_token: depositId }
                        },
                        relations: {
                            customer: true,
                            plan: true,
                            transaction: {
                                mobileMoney: true
                            }
                        }
                    },
                )

                if (order) this._purchase.pawaPayWebhookOrderComplete(order, depositId);

                const topup = await this._TopupOrderRepo.findOne({
                    where: {
                        transaction: { transaction_token: depositId, status: 'PENDING' }
                    },
                    relations: {
                        customer: true,
                        plan: true,
                        transaction: {
                            mobileMoney: true
                        }
                    }
                })

                if (topup) this._recharge.pawapayWebhookRechargeComplete(topup, depositId);


                const transaction = await this._transRepo.findOne({
                    where: {
                        status: 'PENDING',
                        transaction_token: depositId
                    },
                    relations: {
                        mobileMoney: true
                    }
                })

                if((!order && !topup) && transaction) this._wallet.pawaPayWebhookWalletRechargeComplete(transaction, depositId);

            }

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async pesaPalPaymentV2(body: any, req: Request) {
        try {

            const { OrderTrackingId } = body;

            // return await this._api.getTransactionStatus(OrderTrackingId);

            const payment = await this._api.getTransactionStatus(OrderTrackingId);
            console.log(payment);
            if (payment.status_code != 1) {
                this._socket.sendTransactionUpdates(payment.merchant_reference, { topic: 'transaction-updates', data: { sucess: false, message: 'your transaction has been failed due to some reason' } });
            } else {

                const order = await this._orderRepo.findOne(
                    {
                        where: {
                            transaction: { transaction_token: payment.merchant_reference }
                        },
                        relations: {
                            customer: true,
                            plan: true,
                            transaction: {
                                mobileMoney: true
                            }
                        }
                    },
                )

                if (order) this._purchase.pesapalWebhookOrderComplete(order, payment.merchant_reference);


                const topup = await this._TopupOrderRepo.findOne({
                    where: {
                        transaction: { transaction_token: payment.merchant_reference, status: 'PENDING' }
                    },
                    relations: {
                        customer: true,
                        plan: true,
                        transaction: {
                            mobileMoney: true
                        }
                    }
                })

                if(topup) this._recharge.pesapalWebhookRechargeComplete(topup, payment.merchant_reference);

                const transaction = await this._transRepo.findOne({
                    where: {
                        status: 'PENDING',
                        transaction_token: payment.merchant_reference
                    },
                    relations: {
                        mobileMoney: true
                    }
                })

                if((!order && !topup) && transaction) this._wallet.pawaPayWebhookWalletRechargeComplete(transaction, payment.merchant_reference);


            }

            return payment;

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async payStackWebhook(body: any, req: Request){
        try {
            
            const {event, data} = body;

            console.log(data.reference);
            const payment = await this._api.payStackVerifyPayment(data.reference)
            console.log(payment.data.status);
            if (payment.data.status != 'success') {
                this._socket.sendTransactionUpdates(payment.data.reference, { topic: 'transaction-updates', data: { sucess: false, message: 'your transaction has been failed due to some reason' } });
            }else{

                const order = await this._orderRepo.findOne(
                    {
                        where: {
                            transaction: { transaction_token: payment.data.reference }
                        },
                        relations: {
                            customer: true,
                            plan: true,
                            transaction: {
                                mobileMoney: true
                            }
                        }
                    },
                )

                if(order) await this._purchase.paystackWebhookOrderComplete(order, payment.data.reference);


                const topup = await this._TopupOrderRepo.findOne({
                    where: {
                        transaction: { transaction_token: payment.data.reference, status: 'PENDING' }
                    },
                    relations: {
                        customer: true,
                        plan: true,
                        transaction: {
                            mobileMoney: true
                        }
                    }
                })

                if(topup) this._recharge.paystackWebhookRechargeComplete(topup, payment.data.reference);


                const transaction = await this._transRepo.findOne({
                    where: {
                        status: 'PENDING',
                        transaction_token: payment.data.reference
                    },
                    relations: {
                        mobileMoney: true
                    }
                })

                if((!order && !topup) && transaction) this._wallet.payStackWebhookWalletRechargeComplete(transaction, payment.data.reference);

            }


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }


}
