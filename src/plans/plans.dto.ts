import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsNumber, IsNumberString, Max, Min } from "class-validator";


export class createPlanDto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    package_id: number;

    @IsNotEmpty()
    @IsNumber()
    price: number


}

export class updatePlanDto{

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    plan_id: number;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    package_id: number;

    @IsNotEmpty()
    @IsNumber()
    price: number;
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

export class UploadPricingDto{
    list: any[]
}