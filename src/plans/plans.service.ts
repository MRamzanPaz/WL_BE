import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plans } from 'src/entities/plans.entites';
import { plans_Counties } from 'src/entities/plans_countries.entity';
import { ApiService } from 'src/shared/service/api.service';
import { ResponseService } from 'src/shared/service/response.service';
import { In, IsNull, Like, Repository } from 'typeorm';
import { PaginationDto, UploadPricingDto, createPlanDto, updatePlanDto } from './plans.dto';
import { Request } from 'express';
import { Countries } from 'src/entities/country.entity';

@Injectable()
export class PlansService {

    constructor(
        @InjectRepository(Plans)
        private readonly _plansRepo: Repository<Plans>,
        @InjectRepository(plans_Counties)
        private readonly _plan_countriesRepo: Repository<plans_Counties>,
        @InjectRepository(Countries)
        private readonly _countryRepo: Repository<Countries>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
    ) { }


    async uploadPlanPricing(body: UploadPricingDto, req: Request) {
        try {

            const { list } = body;

            for (const plan of list) {

                await this._plansRepo.createQueryBuilder()
                    .update()
                    .set({
                        data: plan.data,
                        global_plan: plan.global_plan,
                        isRegional: plan.isRegional,
                        name: plan.name,
                        planType: plan.planType,
                        price: plan.price,
                        region: plan.region,
                        singleUse: plan.singleUse,
                        testPlan: plan.testPlan,
                        validity: plan.validity
                       
                    })
                    .where("id = :id", { id: plan.id })
                    .execute()

            }

            return this.res.generateResponse(HttpStatus.OK, "Pricing updated successfully!", [], req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async createPlan(body: createPlanDto, req: Request) {
        try {
            const { package_id, price } = body;
    
            const eSimPlanRes = await this._api.getPlanById(package_id);
    
            if (eSimPlanRes.code != 200) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, eSimPlanRes.message, null, req);
            }
    
            const findOne = await this._plansRepo.findOne({
                where: {
                    package_id: package_id,
                    deleted_at: IsNull()
                }
            });
    
            if (findOne) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "This package is already in use in another plan!", null, req);
            }
    
            const { data } = eSimPlanRes;
    
            const payload: Plans | any = {
                name: data.name,
                price: JSON.stringify(price),
                cost_price: data.price,
                data: data.data,
                package_id: data.id,
                planType: data.planType,
                region: data.region,
                singleUse: data.singleUse,
                testPlan: data.testPlan,
                validity: data.validity,
                global_plan: data.global_plan,
                isRegional: data.isRegional,
                description: data.description  // Add description to the payload
            };
    console.log('plan data',data)
            const createPlan: any = this._plansRepo.create(payload);
            await this._plansRepo.save(createPlan);
    
            for (const planCountry of data.countries) {
                const countryPayload: plans_Counties | any = {
                    country_name: planCountry.country_name,
                    country_code: planCountry.country_code,
                    iso2: planCountry.iso2,
                    iso3: planCountry.iso3,
                    phone_code: planCountry.phone_code,
                    Plan: createPlan.id
                };
                const createPlanCountry = this._plan_countriesRepo.create(countryPayload);
                await this._plan_countriesRepo.save(createPlanCountry);
            }
    
            return this.res.generateResponse(HttpStatus.OK, "Plan created successfully!", null, req);
        } catch (error) {
            return this.res.generateError(error, req);
        }
    }
    

    async updatePlan(body: updatePlanDto, req: Request) {

        try {

            const { plan_id, package_id, price } = body;

            const isPackageAlreadyUsed = await this._plansRepo.createQueryBuilder('Plans')
                .where("id != :plan_id AND package_id = :package_id AND deleted_at IS NULL", { plan_id, package_id })
                .getMany()

            if (isPackageAlreadyUsed.length) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "This package is already use in another plan or might be plan deleted earlier!", null, req);
            }

            const eSimPlanRes = await this._api.getPlanById(package_id);

            if (eSimPlanRes.code != 200) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Package not found", null, req)
            }

            const { data } = eSimPlanRes;

            const payload: Plans | any = {
                name: data.name,
                price: JSON.stringify(price),
                cost_price: data.price,
                data: data.data,
                package_id: data.id,
                planType: data.planType,
                region: data.region,
                singleUse: data.singleUse,
                testPlan: data.testPlan,
                validity: data.validity,
                global_plan: data.global_plan
            }

            const updatePlan = await this._plansRepo.createQueryBuilder('Plans')
                .update()
                .set(payload)
                .where("id = :id", { id: plan_id })
                .execute()

            const deletePrevCountries = await this._plan_countriesRepo.createQueryBuilder('plans_Counties')
                .update()
                .set({
                    deleted_at: new Date(),
                })
                .where("plan_id = :plan_id AND deleted_at IS NULL", { plan_id })
                .execute()

            for (const planCountry of data.countries) {
                const countryPayload: plans_Counties | any = {
                    country_name: planCountry.country_name,
                    country_code: planCountry.country_code,
                    iso2: planCountry.iso2,
                    iso3: planCountry.iso3,
                    phone_code: planCountry.phone_code,
                    Plan: plan_id
                }
                const createPlanCountry = this._plan_countriesRepo.create(countryPayload)
                await this._plan_countriesRepo.save(createPlanCountry);
            }

            return this.res.generateResponse(HttpStatus.OK, "Plan updated successfully!", null, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async deletePlan(id: string, req: Request) {

        try {

            const findAndDelete = await this._plansRepo.createQueryBuilder('Plans')
                .update()
                .set({
                    deleted_at: new Date()
                })
                .where("id = :id AND deleted_at IS NULL", { id: parseInt(id) })
                .execute()

            if (!findAndDelete.affected) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan does not exist!", null, req)
            }

            return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Plan deleted successfully!", [], req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllPLans(req: Request) {

        try {
            const findAllPlans: Plans[] = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    countires: {
                        deleted_at: IsNull()
                    }
                },
                relations: {
                    countires: true
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Plans list", findAllPlans, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllPlanByPagination(params: PaginationDto, req: Request) {

        try {

            const { pageSize, page, searchStr } = params;
            // console.log(searchStr)
            const findAllPlans = await this._plansRepo.find({
                where: {
                    name: Like(`%${searchStr}%`),
                    deleted_at: IsNull(),
                    countires: {
                        deleted_at: IsNull()
                    },
                },
                relations: {
                    countires: true,
                },
                skip: (page - 1) * pageSize,
                take: pageSize,

            })

            const total_count = await this._plansRepo.count({
                where: {
                    name: Like(`%${searchStr}%`),
                    deleted_at: IsNull(),
                    countires: {
                        deleted_at: IsNull()
                    },
                }
            })

            const data = {
                list: findAllPlans,
                total_count,
                page,
                pageSize
            }

            return this.res.generateResponse(HttpStatus.OK, "Plans List", data, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllPlanBySearch(search_str: string, req: Request) {
        try {

            // const countries = await this._plan_countriesRepo.createQueryBuilder('plans_Counties')
            // .where("deleted_at IS NULL AND country_name LIKE :name", {name: `%${search_str}%`})
            // .select("country_code")
            // .addSelect("country_name")
            // .addSelect("iso2")
            // .addSelect("iso3")
            // .addSelect("phone_code")
            // .groupBy("country_code")
            // .addGroupBy("country_name")
            // .addGroupBy("iso2")
            // .addGroupBy("iso3")
            // .addGroupBy("phone_code")
            // .getRawMany();

            // const countries = await this._plansRepo.query(`
            //     SELECT c.country_name, c.country_code, c.iso2, c.iso3, c.phone_code FROM countries_of_plans
            //     LEFT JOIN countries AS c ON c.id = countries_of_plans.countriesId
            //     LEFT JOIN states AS s ON s.country_id = c.id
            //     LEFT JOIN cities AS city ON city.state_id = s.id
            //     WHERE c.country_name LIKE '%${search_str}%' OR s.state_name LIKE '%${search_str}%' OR city.city_name LIKE '%${search_str}%'
            //     GROUP BY c.country_name
            // `).finally()

            const countries = await this._countryRepo.find({
                where:[
                    { country_name: Like(`%${search_str}%`) },
                    {states: {state_name: Like(`%${search_str}%`)}},
                    {states: {cities: { city_name:  Like(`%${search_str}%`)}}}
                ]
            })

            const regions = await this._plansRepo.query(`
            SELECT p.region FROM countries_of_plans
            LEFT JOIN plans AS p ON p.id = countries_of_plans.plansId
            LEFT JOIN countries AS c ON c.id = countries_of_plans.countriesId
            WHERE c.country_name LIKE '%${search_str}%' AND p.isRegional = 1
            GROUP BY p.region
            `).finally()


            // const regions = await this._plansRepo.createQueryBuilder('Plans')
            // .where("Plans.deleted_at IS NULL AND isRegional = true")
            // .leftJoinAndSelect('Plans.countires', 'countires')
            // .andWhere("countires.country_name LIKE :name", {name: `%${search_str}%`})
            // .select("region")
            // .groupBy("region")
            // .getRawMany()



            const data = {
                countries: countries,
                regions: regions
            }

            return this.res.generateResponse(HttpStatus.OK, "Plans list", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getPlanById(id: string, req: Request) {

        try {

            const findOneById = await this._plansRepo.findOne({
                where: {
                    id: parseInt(id),
                    deleted_at: IsNull(),
                    countires: {
                        deleted_at: IsNull()
                    }
                },
                relations: {
                    countires: true,
                }
            })

            if (!findOneById) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, `Plan not found of id ${id}`, findOneById, req)
            }

            return this.res.generateResponse(HttpStatus.OK, `Plan of id ${id}`, findOneById, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllAssignPlans(req: Request) {
        try {

            const allProducts = await this._api.getAllProducts();

            return allProducts

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllCountrie(req: Request) {

        try {

            // const countries = await this._plan_countriesRepo.createQueryBuilder('plans_Counties')
            // .where("deleted_at IS NULL")
            // .select("country_code")
            // .addSelect("country_name")
            // .addSelect("iso2")
            // .addSelect("iso3")
            // .addSelect("phone_code")
            // .groupBy("country_code")
            // .addGroupBy("country_name")
            // .addGroupBy("iso2")
            // .addGroupBy("iso3")
            // .addGroupBy("phone_code")
            // .getRawMany();

            // const countries = await this._countryRepo.find({
            //     where: {
            //         deleted_at: IsNull(),
            //     },
            //     order: {
            //         position: 'ASC'
            //     }
            // })

            const countries = await this._plansRepo.query(`

            SELECT cop.countriesId,country_name, country_code,iso2,iso3,phone_code, POSITION FROM plans AS p
            LEFT JOIN countries_of_plans AS cop ON p.id = cop.plansId
            LEFT JOIN countries AS c ON c.id = cop.countriesId
            WHERE p.deleted_at IS NULL AND cop.countriesId IS NOT NULL
            GROUP BY cop.countriesId
            ORDER BY POSITION ASC

            `)
            return this.res.generateResponse(HttpStatus.OK, "Countries List", countries, req)

        } catch (error) {
            // console.log(error)
            return this.res.generateError(error, req)
        }

    }

    async getAllCountriesPlans(req: Request) {
        try {

            const plans = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    isRegional: false,
                    global_plan: false
                },
                relations: {
                    countires: true
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Plans list", plans, req)

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllRegion(req: Request) {

        try {

            const regions = await this._plansRepo.createQueryBuilder('Plans')
                .where("deleted_at IS NULL AND isRegional = true")
                .select("region")
                .groupBy("region")
                .getRawMany()

            return this.res.generateResponse(HttpStatus.OK, "Region List", regions, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getCountryPlanByCountryCode(country_code: string, req: Request) {
        try {

            const plans = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    isRegional: false,
                    global_plan: false,
                    countires: {
                        iso2: country_code
                    }
                },
                relations: {
                    countires: true
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "plans List", plans, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getPlansCountryWise(country_code: string, req: Request) {
        try {

            const plansCountryWise = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    countires: {
                        iso2: country_code
                    },
                    recharge_only: false
                }
            })

            const plansIds = plansCountryWise.map(ele => ele.id);

            const plans = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    id: In(plansIds)
                },
                relations: {
                    countires: true
                }
            })

            // const plansCountryWise = await this._plansRepo.createQueryBuilder()


            // const plansCountryWise = await this._plan_countriesRepo.find({
            //     where:{
            //        iso2: country_code,
            //        deleted_at: IsNull(),
            //        Plan: {
            //         countires: {
            //             deleted_at: IsNull()
            //         }
            //        }
            //     },
            //     relations: ["Plan"],
            //     select: {
            //        id: true
            //     }
            // })

            return this.res.generateResponse(HttpStatus.OK, "Plans List", plans, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getPlansRegionWise(region: string, req: Request) {
        try {

            const regionWisePlans = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    name: Like(`%${region}%`),
                    region: region,
                    isRegional: true,
                    recharge_only: false,
                    countires: {
                        deleted_at: IsNull()
                    }
                },
                relations: {
                    countires: true
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "Region Wise Plans", regionWisePlans, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllGlobalPlans(req: Request) {
        try {

            const allGlobalPlans = await this._plansRepo.find({
                where: {
                    deleted_at: IsNull(),
                    name: Like(`%global%`),
                    recharge_only: false,
                    countires: {
                        deleted_at: IsNull()
                    }
                },
                relations: {
                    countires: true
                }
            })

            // console.log(allGlobalPlans)

            return this.res.generateResponse(HttpStatus.OK, "Global Plans", allGlobalPlans, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async syncAllAssignPlan(req: Request) {
    try {
        const allAssignPlans: any = await this._api.getAllProducts();

        await this._plansRepo.createQueryBuilder()
            .update()
            .set({
                deleted_at: new Date(),
            })
            .where("deleted_at IS NULL")
            .execute();

        const { data } = allAssignPlans;
        console.log(data);

        for (const assignPlan of data) {
            const isAlreadySet = await this._plansRepo.findOne({
                where: {
                    package_id: assignPlan.id,
                },
            });

            const countriesIds = assignPlan?.countries?.map(ele => ele.id);
            const findPlanCountries = await this._countryRepo.find({
                where: {
                    id: In(countriesIds),
                },
            });

            const payload: Plans | any = {
                name: assignPlan.name,
                price: assignPlan.price,
                cost_price: assignPlan.price,
                data: assignPlan.data,
                package_id: assignPlan.id,
                planType: assignPlan.planType,
                region: assignPlan.region,
                singleUse: assignPlan.singleUse,
                testPlan: assignPlan.testPlan,
                validity: assignPlan.validity,
                global_plan: assignPlan.global_plan,
                isRegional: assignPlan.isRegional,
                recharge_only: assignPlan.recharge_only,
                msisdn: assignPlan.msisdn,
                voicemail_system: assignPlan.voicemail_system,
                state: assignPlan.state,
                rate_center: assignPlan.rate_center,
                description: assignPlan.description, // Added description field
            };

            if (isAlreadySet) {
                await this._plansRepo.createQueryBuilder('Plans')
                    .update()
                    .set({
                        ...payload,
                        deleted_at: null,
                    })
                    .where("id = :id", { id: isAlreadySet.id })
                    .execute();
            } else {
                payload.countries = findPlanCountries; // Correct assignment to 'countries' relationship
                const createPlan: any = this._plansRepo.create(payload);
                await this._plansRepo.save(createPlan);
            }
            
        }

        return this.res.generateResponse(HttpStatus.OK, "Synchronize all plans successful", [], req);
    } catch (error) {
        return this.res.generateError(error, req);
    }
}


    async regionWiseAllPlans(req: Request) {
        try {

            const regions = await this._plansRepo.createQueryBuilder('Plans')
                .where("deleted_at IS NULL AND isRegional = true")
                .select("region")
                .groupBy("region")
                .getRawMany()

            const data: any[] = [];

            for (const reg of regions) {
                const plans = await this._plansRepo.find({
                    where: {
                        deleted_at: IsNull(),
                        region: reg.region,
                        isRegional: true,
                        countires: {
                            deleted_at: IsNull()
                        }
                    },
                    relations: {
                        countires: true
                    }
                })

                data.push({
                    name: reg.region,
                    plans: plans
                })

            }

            return this.res.generateResponse(HttpStatus.OK, "All plans", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

}
