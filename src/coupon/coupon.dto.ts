import { Type } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsNumber, Min } from "class-validator";


export class GenerateDto{

    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    start_date: Date;

    expiry_date: Date;

    @IsNotEmpty()
    @IsBoolean()
    isFixed: Boolean;

    noOfUse: number;

    @IsNotEmpty()
    @IsNumber()
    discount: number;

    @IsNotEmpty()
    @IsBoolean()
    systemGenerated: Boolean;

    couponCode: string;
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

export class calcDiscount{

    couponCode: string;

    @IsNotEmpty()
    amount: string;

}