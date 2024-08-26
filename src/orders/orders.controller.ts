import { Body, Controller, Get, Inject, Param, Post, Query, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { ConfirmOrder, ElipaVerifyQuery, MobileMoneyTransDto, MultipleBuyDto, OrderQueryDto, PaginationDto, PurchaseDPODto, PurchaseElipaDto, ReqOrdFwDto, RequestOrderDto, ValidateFWCardDto, authorizeFwCardDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {

    constructor(
        @Inject('ORDERS-SERVICE') private _orders: OrdersService
    ) { }

    @Get('mobile-gateways')
    getAllMobileGateways(@Request() req: request) {
        return this._orders.getAllMobileGateways(req)
    }

    @Post('request')
    requestOrder(@Body() body: RequestOrderDto, @Request() req: request) {
        return this._orders.requestOrder(body, req);
    }

    @Post('request/fwCard')
    requestOrderByFwCard(@Body() body: ReqOrdFwDto, @Request() req: request){
        return this._orders.requestOrderByFwCard(body, req);
    }

    @Post('authorize/fw-card')
    authorizeFwCard( @Body() body:authorizeFwCardDto, @Request() req:request ){
        return this._orders.authorizeFwCard(body, req);
    }

    @Post('validate/fw-card')
    validateFwCard(@Body() body: ValidateFWCardDto, @Request() req: request){
        return this._orders.validateFwCard(body, req)
    }

    @Post('mobileMoney/transaction')
    performMobileMoneTransaction(@Body() body: MobileMoneyTransDto, @Request() req: request) {
        return this._orders.performMobileMoneTransaction(body, req);
    }

    @Post('buyMultipleEsims')
    buyMultipleEsims(@Body() body: MultipleBuyDto, @Request() req: request) {
        return this._orders.buyMultipleEsims(body, req);
    }

    @Post('confirm')
    confirmOrder(@Body() body: ConfirmOrder, @Request() req: request) {
        return this._orders.confirmOrder(body, req)
    }

    @Get('mobile-payment/status/:transaction_id')
    getMobilePaymentStatus(@Param('transaction_id') transaction_id: string, @Request() req: request) {
        return this._orders.getMobilePaymentStatus(transaction_id, req);
    }

    @Get('esims')
    getAllOrders(@Request() req: request) {
        return this._orders.getAllOrders(req)
    }

    @Get('esims/pagination')
    getAllOrdersByPagination(@Query() Params: PaginationDto, @Request() req: request) {
        return this._orders.getAllOrdersByPagination(Params, req)
    }

    @Get('esims/:customer_id')
    getAllOrderByCustomerId(@Param('customer_id') customer_id: string, @Request() req: request) {
        return this._orders.getAllOrdersByCustomerId(customer_id, req)
    }

    @Get('recharge')
    getAllRechargeOrders(@Request() req: request) {
        return this._orders.getAllRechargeOrders(req)
    }

    @Get('recharge/adjust')
    adjustOrderNumberInTopups(@Request() req: request) {
        return this._orders.adjustOrderNumberInTopups(req);
    }

    @Get('recharge/pagination')
    getAllRechargeOrdersByPagination(@Query() Params: PaginationDto, @Request() req: request) {
        return this._orders.getAllRechargeOrdersByPagination(Params, req);
    }

    @Get('recharge/:customer_id')
    getAllRechargeOrderByCustomerId(@Param('customer_id') customer_id: string, @Request() req: request) {
        return this._orders.getAllRechargeOrdersByCustomerId(customer_id, req)
    }

    @Get('details')
    getOrderByOrderIdAndCustomerId(@Query() query: OrderQueryDto, @Request() req: request) {
        return this._orders.getOrderByOrderIdAndCustomerId(query, req);
    }

    @Post('purchase/dpo')
    purchaseEsimByDPO(@Body() body: PurchaseDPODto, @Request() req: request){
        return this._orders.purchaseEsimByDPO(body, req);
    }

    @Get('verify-payment/dpo/:order_no')
    verifyAndGetOrderDetails(@Param('order_no') order_no: string, @Request() req: request){
        return this._orders.verifyAndGetOrderDetails(order_no, req);
    }

    @Post('purchase/eLipa')
    purchaseEsimWithElipa(@Body() body: PurchaseElipaDto, @Request() req: request){
        return this._orders.purchaseEsimWithElipa(body, req)
    }

    @Get('verify-payment/eLipa')
    verifyElipaPaymentAndGetOrder(@Query() query: ElipaVerifyQuery, @Request() req: request){
        return this._orders.verifyElipaPaymentAndGetOrder(query, req)
    }
}
