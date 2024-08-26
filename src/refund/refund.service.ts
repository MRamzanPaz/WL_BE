import { Body, HttpException, HttpStatus, Inject, Injectable, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefundActivities } from 'src/entities/refundActivities.entity';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Repository } from 'typeorm';
import { InitiateDto } from './refund.dto';
import { Request } from 'express';
import { ApiService } from 'src/shared/service/api.service';
import { GeneralService } from 'src/shared/service/general.service';
import { EsimOrders } from 'src/entities/esim-orders.entity';
import { PawaPayRefunds } from 'src/entities/pawaPayRefunds.entity';

@Injectable()
export class RefundService {
    constructor(
        @InjectRepository(RefundActivities) private _refundRepo: Repository<RefundActivities>,
        @InjectRepository(EsimOrders) private readonly _ordersRepo: Repository<EsimOrders>,
        @InjectRepository(PawaPayRefunds) private readonly _pwpRefundRepo: Repository<PawaPayRefunds>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject("API-SERVICE") private _api: ApiService,
        @Inject('GENERAL-SERVICE') private _general: GeneralService,
    ){}

    async initiateRefundToCustomer(body: InitiateDto, req: Request){
        try {
            
            const { order_no } = body;


            const order = await this._ordersRepo.findOne({
                where: {
                    order_code: order_no
                },
                relations: {
                    transaction: {
                        mobileMoney: true
                    }
                }
            })

            if(!order){
                throw new HttpException("Invalid order number provided!", HttpStatus.BAD_REQUEST)
            }

            const pawapayRefunds = await this._pwpRefundRepo.findOne({
                where: {
                    order: {
                        order_code: order_no
                    }
                }
            })

            if(pawapayRefunds){
                throw new HttpException("This refund request is already in progress!", HttpStatus.BAD_REQUEST)
            }

            const {data} = await this._api.checkRefundStatus(order_no);

            if(!data){
                throw new HttpException("Please request refund on portal first!", HttpStatus.BAD_REQUEST)
            }

            if (data.order.status != "REFUNDED") {
                throw new HttpException("You cannot request a refund until the administrator has approved your request", HttpStatus.BAD_REQUEST)
            }

            const refundId = this._general.generatePawaPayaRefundId();

            const payload = {
                refundId: refundId,
                depositId: order.transaction.transaction_token
            }

            const submitedRefund = await this._api.submitPawaPayRefund(payload);
            console.log("Pawa pay refund submit: ",submitedRefund);
            if (submitedRefund.status != 'ACCEPTED') {
                throw new HttpException("Pawa pay not accepting your request", HttpStatus.FORBIDDEN)
            }

            const refundActivities = this._refundRepo.create({
                status: "PENDING",
                order_no: order_no,
                order: order,
                note: "Refund in progress"
            })

            await this._refundRepo.save(refundActivities)

            const pawapayRefund = this._pwpRefundRepo.create({
                refund_id: refundId,
                status: "IN-PROGRESS",
                order: order
            })

            await this._pwpRefundRepo.save(pawapayRefund);

            const resData = {
                order_no: order_no
            }
            return this.res.generateResponse(HttpStatus.OK, "Refund Requested successfully!", resData, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getRefundList(req: Request){
        try {
            
            const refundList = await this._refundRepo.find({
                where: {
                    deleted_at: IsNull()
                },
                order: {
                    id: 'DESC'
                },
                relations: {
                    order: true
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Refund List", refundList, req);

        } catch (error) {
            return this.res.generateError(error,req);
        }
    }

}
