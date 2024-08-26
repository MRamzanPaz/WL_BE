import { Body, Controller, Get, Inject, Param, Post, Request } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { Request as request } from 'express';
import { CreateDevice } from './devices.dto';

@Controller('devices')
export class DevicesController {

    constructor(
        @Inject('DEVICE-SERVICE') private _devices: DevicesService
    ){}

    @Post('add')
    addAllDevices(@Request() req: request){
        return this._devices.addDevices(req)
    }

    @Post('create')
    createDevice( @Body() body: CreateDevice, @Request() req: request ){
        return this._devices.createDevice(body, req);
    }

    @Get('all')
    getAllDevices(@Request() req: request){
        return this._devices.getAllDevices(req)
    }

    @Get(':os')
    getDevicesByOS(@Param('os') os: string, @Request() req: request ){
        return this._devices.getDevicesByOS(os, req)
    }
}
