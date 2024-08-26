import { Controller, Inject, Post, Request } from '@nestjs/common';
import { Request as request} from 'express';
import { CountryService } from './country.service';

@Controller('country')
export class CountryController {

    constructor(
        @Inject('COUNTRY-SERVICE') private _country: CountryService
    ){}

    @Post('sync')
    syncAllCountries(@Request() req: request){
        return this._country.syncAllCountries(req)
    }

}
