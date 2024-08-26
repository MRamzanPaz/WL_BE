import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, Min } from "class-validator";


export class AddFaqDto{

    @IsNotEmpty()
    question: string;

    @IsNotEmpty()
    answer: string;

}


export class UpdateDto{

    @IsNotEmpty()
    @IsNumber()
    id: number;

    @IsNotEmpty()
    question: string;

    @IsNotEmpty()
    answer: string;

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

