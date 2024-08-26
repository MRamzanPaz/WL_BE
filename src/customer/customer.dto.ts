import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";


export class CreateCustomer{

    @IsNotEmpty()
    @IsString()
    firstname: string;

    @IsNotEmpty()
    @IsString()
    lastname: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    middle_name: string;

    country_of_residence: string;
    
    address_detail: string;
    
    address_detail_usa: string;

    phone_number: string;
}



export class AuthenitcateCustomer{

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class PaginationDto{

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

export class TopupDto{

    @IsNotEmpty()
    @Min(1)
    customer_id: number

}

export class RechargeEsimDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    stripe_token: string;

    card_number: string;
   
    card_month: string;
 
    card_year: string;

    card_cvc: string;

    phone_number: string;

    currency: string;

    network: string;

    country: string;

    coupon: string;

}


export class WalletTopupCardDto{

    fullName: string;

    customer_id: string;

    @IsNotEmpty()
    cardNumber: string;

    @IsNotEmpty()
    month: string;

    @IsNotEmpty()
    year: string;

    @IsNotEmpty()
    cvv: string;

    @IsNotEmpty()
    amount: string

}

export class WalletTopupMobMoneyDto{

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    network: string;

    @IsNotEmpty()
    amount: string

}

export class WalletTopupPawaPayDto{
    customer_id: string;

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    network: string;

    @IsNotEmpty()
    country: string;

    @IsNotEmpty()
    amount: string;

}

export class WalletTopupPesaPalDto{
    
    @IsNotEmpty()
    amount: string;
    
}

export class ChangePassword{

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    otp_code: string;

    @IsNotEmpty()
    password: string;

}

export class ChangeVerificationStatus{

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    otp_code: string;

}

export class RechargeCountryDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    country_code: string;

}

export class RechargePackagesDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    data: string;

    @IsNotEmpty()
    country_code: string;

}

export class RechargeQueryDto {

    order_id: string;
    merchant_ref: string;

}


export class RechargeEsimFWCardDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
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

export class RechargeEsimFWCardAuthorizeDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
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

export class ValidateFWRechargeDto{
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    transaction_id: number;

    @IsNotEmpty()
    otp_code: string;
}

export class RechargeEsimDPODto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(6)
    order_by: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    coupon: string;
}


export class WalletRechargeCardDto{

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsNotEmpty()
    stripe_token: string;
}