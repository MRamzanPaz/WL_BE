import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, Min } from "class-validator";


export class StripeCheckoutDto {
    @IsNotEmpty()
    @Type(() => Number)
    @Min(1)
    order_id: number;

}

export class CardDto{

    fullName: string;

    @IsNotEmpty()
    cardNumber: string;

    @IsNotEmpty()
    month: string;

    @IsNotEmpty()
    year: string;

    @IsNotEmpty()
    cvv: string;

}

export class WalletCardDto{

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

export class CreateTokenParams{
    order_id: number;
}

export class CustomerWalletTopup{
    @IsNotEmpty()
    customer_id: string;
}