import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, Min } from "class-validator";

export class ContactUsDto {
    
    subject: string;
    
    @IsNotEmpty()
    firstName: string;

    lastName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    concerning: string;

    @IsNotEmpty()
    message: string;


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

export class ResellerDto {
    @IsNotEmpty()
    fullName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    phone: string;

    companyName: string;

    country: string;
}

export class AffiliateDto {
    @IsNotEmpty()
    fullName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    phone: string;

    companyName: string;
}