import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsString, Max, Min, MinLength, minLength } from "class-validator";


export class RequestOrderDto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(6)
    order_by: number;

    @IsNotEmpty()
    @Min(1)
    deviceId: number;

    stripe_token: string;

    // @IsNotEmpty()
    card_number: string;

    // @IsNotEmpty()
    card_month: string;

    // @IsNotEmpty()
    card_year: string;

    // @IsNotEmpty()
    card_cvc: string;

    phone_number: string;

    currency: string;

    network: string;

    country: string;

    order_mode: string;

}

export class MultipleBuyDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    customer_id: number;

    @ArrayNotEmpty()
    @IsArray()
    plan_ids: number[] = []

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(6)
    order_by: number;

    stripe_token: string;

    phone_number: string;

    currency: string;

    network: string;

    country: string;

    couponCode: string;
}

export class ReqOrdFwDto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(6)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    deviceId: number;

    @IsNotEmpty()
    card_number: string;

    @IsNotEmpty()
    card_month: string;

    @IsNotEmpty()
    card_year: string;

    @IsNotEmpty()
    card_cvc: string;

    @IsNotEmpty()
    cardHolder_fullname: string;

    coupon_code: string;

    affiliateCode: string;

}

export class PurchaseDPODto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(6)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    deviceId: number;

    // MM-end

    coupon_code: string;

    affiliateCode: string;

}

export class PurchaseElipaDto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(7)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    deviceId: number;

    @IsNotEmpty()
    country_iso3: string;

    phone_number: string;

    // MM-end

    coupon_code: string;

    affiliateCode: string;

}

export class authorizeFwCardDto {

    @IsNotEmpty()
    card_number: string;

    @IsNotEmpty()
    card_month: string;

    @IsNotEmpty()
    card_year: string;

    @IsNotEmpty()
    card_cvc: string;

    @IsNotEmpty()
    cardHolder_fullname: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    transaction_id: number;

    @IsNotEmpty()
    authorization: autorizeCard;

}

interface autorizeCard {

    mode: string;
    // for pin authorization
    pin: string;
    // for address authorization
    city: string;
    address: string;
    state: string;
    country: string;
    zipcode: string;

}

export class ValidateFWCardDto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    transaction_id: number;

    @IsNotEmpty()
    otp_code: string;

}

export class ConfirmOrder {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    transaction_id: number;

    couponCode: string;

    affiliateCode: string;

}

export class PaginationDto {

    @IsNotEmpty()
    @Type(() => Number)
    @Min(1)
    page: number;

    @IsNotEmpty()
    @Type(() => Number)
    @Min(1)
    pageSize: number;

    searchStr: string;
}

export class MobileMoneyTransDto {

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    transaction_id: number;

    couponCode: string;

}

export class OrderQueryDto {

    order_id: string;
    customer_id: string;
    merchant_ref: string

}

export class ElipaVerifyQuery {
    @IsNotEmpty()
    order_no: string;

    @IsNotEmpty()
    status: string;
}