import { IsEmail, IsNotEmpty, IsString } from "class-validator";


export class ActivationDto{

    @IsNotEmpty()
    iccid: string;

    @IsNotEmpty()
    @IsString()
    firstname: string;

    @IsNotEmpty()
    @IsString()
    lastname: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

}