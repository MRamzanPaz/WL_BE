import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, Request } from '@nestjs/common';
import { Request as request } from 'express';
import { PlansService } from './plans.service';
import { PaginationDto, UploadPricingDto, createPlanDto, updatePlanDto } from './plans.dto';

@Controller('plans')
export class PlansController {
    constructor(
        @Inject('PLANS-SERVICE') private _plan: PlansService
    ){}

    @Post('create')
    createPlans( @Body() body: createPlanDto, @Request() req: request ){
        return  this._plan.createPlan(body, req)
    }

    @Put('uploadPricing')
    uploadPlanPricing(@Body() body: UploadPricingDto, @Request() req: request ){
        return this._plan.uploadPlanPricing(body, req)
    }

    @Get('sycnc')
    syncronizeAllAssignPlans( @Request() req: request ){
        return this._plan.syncAllAssignPlan(req)
    }

    @Put('update')
    updatePlan(@Body() body: updatePlanDto, @Request() req: request){
        return this._plan.updatePlan(body,req);
    }

    @Delete('delete/:id')
    deletePlan(@Param('id') id: string, @Request() req: request){
        return this._plan.deletePlan(id, req);
    }

    @Get('all')
    getAllPlans(@Request() req: request){
        return this._plan.getAllPLans(req)
    }

    @Get('country_plan/:country_code')
    getCountryPlanByCountryCode( @Param("country_code") country_code: string, @Request() req: request ){
        return this._plan.getCountryPlanByCountryCode(country_code, req)
    }

    @Get('countrywise/:country_code')
    getAllPlansCountryWise( @Param("country_code") country_code: string, @Request() req: request ){
        return this._plan.getPlansCountryWise(country_code, req)
    }

    @Get('regionwise/:region')
    getAllPlansRegionWise( @Param("region") region: string, @Request() req: request ){
        return this._plan.getPlansRegionWise(region, req)
    }

    @Get('global')
    getAllGlobalPlans(@Request() req: request){
        return this._plan.getAllGlobalPlans(req)
    }
   
    @Get('all/countries')
    getAllCountries(@Request() req: request){
        return this._plan.getAllCountrie(req)
    }
    @Get('all/countries/plans')
    getAllCountriesPlans(@Request() req: request){
        return this._plan.getAllCountriesPlans(req);
    }

    @Get('all/regions')
    getAllRegion(@Request() req: request){
        return this._plan.getAllRegion(req)
    }

    @Get('all/assign')
    getAllAssignPlans(@Request() req: request){
        return this._plan.getAllAssignPlans(req)
    }

    @Get("all/pagination")
    getAllPlansWithPagination( @Query() params: PaginationDto, @Request() req: request ){
        return this._plan.getAllPlanByPagination(params, req)
    }

    @Get('all/search/:search_str')
    getAllPlanBySearch(@Param('search_str') search_str: string , @Request() req: request){
        return this._plan.getAllPlanBySearch(search_str, req)
    }

    @Get('regionWiseAllPlans')
    regionWiseAllPlans(@Request() req: request){
        return this._plan.regionWiseAllPlans(req);
    }

    @Get(':id')
    getPlanById( @Param('id') id: string, @Request() req: request){
        return this._plan.getPlanById(id, req);
    }


}
