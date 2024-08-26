import { Body, Controller, Get, Inject, Param, Post, Request } from '@nestjs/common';
import { SimActivationService } from './sim_activation.service';
import { Request as request } from 'express';
import { ActivationDto } from './sim_activation.dto';

@Controller('sim-activation')
export class SimActivationController {

    constructor(
        @Inject('ACTIVATION-SERVICE') private _activation: SimActivationService,
    ){}

    @Get('all')
    getAllActivatedeSim(@Request() req: request){
        return req.headers.authorization
    }

    @Get('validate/:iccid')
    validateEsim( @Param('iccid') iccid: string, @Request() req: request){
        return this._activation.validateEsim(iccid, req);
    }

    @Post('activate')
    activateEsim( @Body() body: ActivationDto, @Request() req: request){
        return this._activation.activateEsim(body, req)
    }

}
