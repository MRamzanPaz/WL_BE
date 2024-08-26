import { IsNotEmpty } from "class-validator";


export class SetupEmailDto{

    @IsNotEmpty()
    id: number;

    @IsNotEmpty()
    logo_link: string;

    @IsNotEmpty()
    android_vedio_link: string;

    @IsNotEmpty()
    iOS_vedio_link: string;


}