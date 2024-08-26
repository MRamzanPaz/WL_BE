import { IsInt, IsNotEmpty, Min } from "class-validator";


export class RechargeStipeDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    stripe_token: string;

    coupon: string;

}

export class FwMMDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    coupon: string;

}

export class PawaPayDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    @IsNotEmpty()
    country_code: string;

    coupon: string;


}


export class PesaPalDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    coupon: string;

}

export class FWCardDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    cardHolder_fullname: string;

    @IsNotEmpty()
    card_number: string;

    @IsNotEmpty()
    card_month: string;

    @IsNotEmpty()
    card_year: string;

    @IsNotEmpty()
    card_cvc: string;

    coupon: string;

}

export class AuthorizeFWCardDto{

    @IsNotEmpty()
    tr_ref: string;

    @IsNotEmpty()
    cardHolder_fullname: string;

    @IsNotEmpty()
    card_number: string;

    @IsNotEmpty()
    card_month: string;

    @IsNotEmpty()
    card_year: string;

    @IsNotEmpty()
    card_cvc: string;

    @IsNotEmpty()
    authorization: string;

    pin: string;

    city: string;

    address: string;

    state: string;

    country: string;

    zipcode: string;
}


export class ValidationFWCardDto{

    @IsNotEmpty()
    tr_ref: string;

    @IsNotEmpty()
    flw_ref: string;

    @IsNotEmpty()
    otp: string;
}

export class CustomerwalletDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    coupon: string;

}

export class DPODto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    coupon: string;

}

export class DpoVerifyDto{

    @IsNotEmpty()
    tr_ref: string;
    
}


export class ElipaDto{

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    country_code: string;

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    coupon: string;

}

export class ElipaVerifyDto{

    @IsNotEmpty()
    tr_ref: string;

    @IsNotEmpty()
    trans_status: string;

}

export class PayStackDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    coupon: string;

}