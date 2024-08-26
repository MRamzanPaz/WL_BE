import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Request } from 'express';
import * as moment from 'moment';
import { GeneralService } from 'src/shared/service/general.service';
import { PawapayTransactions } from 'src/entities/pawapayTransactions.entity';
import convertor from 'convert-string-to-number';
import { Coupons } from 'src/entities/coupon.entity';
import { AccountingReport } from 'src/entities/accounting_report.entity';
import Stripe from 'stripe';
@Injectable()
export class ReportService {
    private readonly STRIPE = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });
    constructor(
        @InjectRepository(EsimOrders)
        private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(TopupOrders)
        private readonly _topupOrdersRepo: Repository<TopupOrders>,
        @InjectRepository(PawapayTransactions)
        private readonly _pawapayTransactions: Repository<PawapayTransactions>,
        @InjectRepository(Coupons)
        private readonly _couponRepo: Repository<Coupons>,
        @InjectRepository(AccountingReport)
        private readonly _accReportRepo: Repository<AccountingReport>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
    ) { }

    async generateAccountingReport(req: Request) {

        const esimOrders = await this._ordersRepo.find({
            where: {
                deleted_at: IsNull(),
                status: 'COMPLETED',
            },
            relations: {
                plan: true,
                customer: true,
                transaction: {
                    mobileMoney: true
                }
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

        const topupOrders = await this._topupOrdersRepo.find({
            where: {
                deleted_at: IsNull(),
                transaction: {
                    status: 'COMPLETED'
                }
            },
            relations: {
                plan: true,
                customer: true,
                transaction: {
                    mobileMoney: true
                }
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

        const allOrders: any = [...topupOrders, ...esimOrders];

        const temp: any[] = []
        for (const item of allOrders) {
            if (item.order_by == 1) {
                if (item?.transaction?.transaction_token.includes('ch_')) {
                    const convertTrxAmount: any = convertor(parseFloat(convertor(item.transaction.amount)).toFixed(2));
                    const convertCostPrice: any = convertor(parseFloat(convertor(item.plan?.cost_price)).toFixed(2));
                    const convertTrxfeeToDollar: any = await this._general.getStripeTransFees(item?.transaction?.transaction_token);
                    const finalAmountAfterDeduction: any = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
                    console.log(typeof finalAmountAfterDeduction, typeof convertTrxAmount, typeof convertCostPrice, typeof convertTrxfeeToDollar);
                    let coupDiscount: any = 0;
                    if (item.couponCode) {
                        coupDiscount = await this.getCouponDisc(item.couponCode)
                    }

                    temp.push({
                        order_date: moment(item.created_at).format('DD MMMM YYYY'),
                        order_time: moment(item.created_at).format('HH:MM:SS'),
                        order_code: item.order_code ? item.order_code : item.order_no,
                        transaction_id: item.transaction?.id,
                        customer_fullname: `${item.customer?.firstname} ${item.customer?.lastname}`,
                        customer_email: item.customer?.email,
                        iccId: item.iccid,
                        plan_name: item.plan?.name,
                        data: item.plan?.data,
                        validity: item?.plan.validity,
                        sale_price_inc_VAT: null,
                        sale_price_excl_VAT: item.plan?.price,
                        coupon_code: item.couponCode,
                        disc_from_coupon_code: coupDiscount,
                        amount_paid: convertTrxAmount,
                        cost_price: convertCostPrice,
                        payment_mode: this.getPaymentType(item.order_by),
                        payment_tx_fee: convertTrxfeeToDollar,
                        profit: finalAmountAfterDeduction.toFixed(3)
                    })
                }
            }
            if (item.order_by == 4) {
                const payload = {
                    amount: convertor(parseFloat(convertor(item.transaction.amount)).toFixed(2)),
                    countryCode: item.transaction.mobileMoney.country_code,
                    network: item.transaction.mobileMoney.network
                }
                const convertTrxfeeToDollar: any = await this.convertAmount(payload);
                const convertTrxAmount: any = convertor(parseFloat(convertor(item.transaction.amount)).toFixed(2));
                const convertCostPrice: any = convertor(parseFloat(convertor(item.plan?.cost_price)).toFixed(2));
                const finalAmountAfterDeduction: any = convertTrxAmount - (convertCostPrice + convertTrxfeeToDollar);
                // console.log(item.order_code, item.couponCode, finalAmountAfterDeduction);
                let coupDiscount: any = 0;
                if (item.couponCode) {
                    coupDiscount = await this.getCouponDisc(item.couponCode)
                }

                temp.push({
                    order_date: moment(item.created_at).format('DD MMMM YYYY'),
                    order_time: moment(item.created_at).format('HH:MM:SS'),
                    order_code: item.order_code ? item.order_code : item.order_no,
                    transaction_id: item.transaction?.id,
                    customer_fullname: `${item.customer?.firstname} ${item.customer?.lastname}`,
                    customer_email: item.customer?.email,
                    iccId: item.iccid,
                    plan_name: item.plan?.name,
                    data: item.plan?.data,
                    validity: item?.plan.validity,
                    sale_price_inc_VAT: null,
                    sale_price_excl_VAT: item.plan?.price,
                    coupon_code: item.couponCode,
                    disc_from_coupon_code: coupDiscount,
                    amount_paid: convertTrxAmount,
                    cost_price: convertCostPrice,
                    payment_mode: this.getPaymentType(item.order_by),
                    payment_tx_fee: convertTrxfeeToDollar.toFixed(3),
                    profit: finalAmountAfterDeduction.toFixed(3)
                })
            }
        }
        console.log(temp);
        await this._accReportRepo.createQueryBuilder()
            .insert()
            .into(AccountingReport)
            .values(temp)
            .orIgnore()
            .execute()

        return this.res.generateResponse(HttpStatus.OK, "Report Generated", [], req);

    }

    async getReport(req: Request) {
        const report = await this._accReportRepo.find({
            where: {
                deleted_at: IsNull()
            },
            order: {
                id: 'DESC'
            }
        });

        return this.res.generateResponse(HttpStatus.OK, "Get Report", report, req);
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


        const getTrxFormula = eval(getTrxFeeData.transactionformula);

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

    getPaymentType(order_by: number) {
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
            default:
                break;
        }

        return type;

    }

    async getTransFee(token: any) {
        const chTokenData = await this.STRIPE.charges.retrieve(token);

        const transToken = chTokenData?.balance_transaction.toString();

        const transTokenData = await this.STRIPE.balanceTransactions.retrieve(transToken)

        const transFeeWithCent = transTokenData?.fee

        const transFeeWithoutCent = transFeeWithCent / 100;

        return transFeeWithoutCent;
    }

}
