import { IsNotEmpty, IsString } from "class-validator";

export class InitiateDto {

    @IsNotEmpty()
    @IsString()
    order_no: string

}