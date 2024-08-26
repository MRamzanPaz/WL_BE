import { IsNotEmpty } from "class-validator";


export class StripeCreateTokenDto{

    @IsNotEmpty()
    card_number: string;

    @IsNotEmpty()
    card_month: string;

    @IsNotEmpty()
    card_year: string;

    @IsNotEmpty()
    card_cvc: string;

}