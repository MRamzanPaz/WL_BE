import { ConsoleLogger, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Cities } from 'src/entities/cities.entity';
import { Countries } from 'src/entities/country.entity';
import { States } from 'src/entities/states.entity';
import { ApiService } from 'src/shared/service/api.service';
import { ResponseService } from 'src/shared/service/response.service';
import { Repository } from 'typeorm';

@Injectable()
export class CountryService {

    constructor(
        @InjectRepository(Countries) private readonly _countryRepo: Repository<Countries>,
        @InjectRepository(States) private readonly _stateRepo: Repository<States>,
        @InjectRepository(Cities) private readonly _cityRepo: Repository<Cities>,
        @Inject('RESPONSE-SERVICE') private _res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService
    ){}

    async syncAllCountries(req: Request){
        try {

            console.log("UN");
            const {data} = await this._api.getAllCountryList();
            console.log(data);

            for (const country of data){

                let allocatedCountry = await this._countryRepo.findOne({
                    where: {
                        country_name: country.country_name,
                        country_code: country.country_code
                    }
                })

                if(!allocatedCountry){
                    allocatedCountry = this._countryRepo.create({
                        country_name: country.country_name,
                        country_code: country.country_code,
                        iso2: country.iso2,
                        iso3: country.iso3,
                        phone_code: country.phone_code
                    })

                    await this._countryRepo.save(allocatedCountry);
                }

                for(const state of country.states){
                    
                    console.log(allocatedCountry.id);
                    let allocatedState = await this._stateRepo.findOne({
                        where: {
                            state_name: state.state_name,
                            country: {
                                id: allocatedCountry.id
                            }
                        }
                    })

                    if (!allocatedState) {
                        
                        allocatedState = this._stateRepo.create({
                            state_name: state.state_name,
                            state_code: state.state_code,
                            country: allocatedCountry
                        })

                        await this._stateRepo.save(allocatedState);

                    }

                    for(const city of state.cities){
                        
                        let allocatedCity = await this._cityRepo.findOne({
                            where: {
                                city_name: city.city_name,
                                state: {
                                    id: allocatedState.id
                                }
                            }
                        })

                        if (!allocatedCity) {
                        
                            allocatedCity = this._cityRepo.create({
                                city_name: city.city_name,
                                state: allocatedState
                            })
    
                            await this._cityRepo.save(allocatedCity);
    
                        }

                    }
                }

            }
            

            return this._res.generateResponse(HttpStatus.OK, "country sync successfully!", [], req);

        } catch (error) {
            return this._res.generateError(error, req);
        }
    }
}
