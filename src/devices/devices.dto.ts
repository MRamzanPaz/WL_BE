import { IsNotEmpty } from "class-validator";

export class CreateDevice{

    @IsNotEmpty()
    model: string;

    @IsNotEmpty()
    os: string;

    @IsNotEmpty()
    brand: string;

    @IsNotEmpty()
    name: string;

}