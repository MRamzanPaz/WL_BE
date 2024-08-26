import { IsInt, IsNotEmpty, Min } from "class-validator";

export class FreePlanDto {

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;
}
export class StripDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    @IsNotEmpty()
    stripe_token: string;

    coupon_code: string;

    affiliateCode: string;

}


export class FwMMDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    coupon_code: string;

    affiliateCode: string;

}

export class PawaPayDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    @IsNotEmpty()
    country_code: string;

    coupon_code: string;

    affiliateCode: string;

}

export class PesaPalDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    coupon_code: string;

    affiliateCode: string;

}

export class FWCardDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

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

    coupon_code: string;

    affiliateCode: string;

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
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    coupon_code: string;

    affiliateCode: string;

}

export class DPODto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    coupon_code: string;

    affiliateCode: string;

}

export class DpoVerifyDto{

    @IsNotEmpty()
    tr_ref: string;
    
}


export class ElipaDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    country_code: string;

    coupon_code: string;

    affiliateCode: string;

}

export class ElipaVerifyDto{

    @IsNotEmpty()
    tr_ref: string;

    @IsNotEmpty()
    trans_status: string;

}

export class PayStackDto{

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    customer_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    device_id: number;

    coupon_code: string;

    affiliateCode: string;

}
