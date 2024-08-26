import { IsNotEmpty } from "class-validator";


export class FlutterwavesVerificationDto{

    @IsNotEmpty()
    event: string;

    @IsNotEmpty()
    data: any;

}

