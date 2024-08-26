import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class StripeDto{

    @IsNotEmpty()
    stripe_token: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
}

export class FwMMDto{

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
}

export class PawaPayDto{

    @IsNotEmpty()
    phone_number: string;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    network: string;

    @IsNotEmpty()
    country_code: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
}

export class PesapalDto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
}


export class FWCardDto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;

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

export class DPODto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
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
    @IsNumber()
    @Min(1)
    amount: number;
}


export class ElipaVerifyDto{

    @IsNotEmpty()
    tr_ref: string;

    @IsNotEmpty()
    trans_status: string;

}


export class PayStackDto{
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    amount: number;
}