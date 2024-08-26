import { IsNotEmpty, IsNumber, Min } from "class-validator";


export class  PurchasePlanDto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    customer_firstname: string;

    @IsNotEmpty()
    customer_lastname: string;

    @IsNotEmpty()
    customer_email: string;

}

export class EsimDetailsQuery{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    type: string;

    @IsNotEmpty()
    id: string;

}