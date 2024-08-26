import { HttpStatus, Inject, Injectable, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Devices } from 'src/entities/devices.entity';
import { ApiService } from 'src/shared/service/api.service';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Repository } from 'typeorm';
import { CreateDevice } from './devices.dto';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Devices)
        private readonly _devicesRepo: Repository<Devices>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
    ){}

    async addDevices(req: Request){
        try {
           
            const {data} = await this._api.getDevices();

            const insertAll = await this._devicesRepo.createQueryBuilder('Devices')
            .insert()
            .values(data)
            .orIgnore()
            .execute()

            return this.res.generateResponse(HttpStatus.OK, "Devices added successfully!", null, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async createDevice(body: CreateDevice, req: Request){
        try {
            
            const { os, brand, name, model } = body;

            const createDevice = await this._devicesRepo.create({
                os,
                brand,
                model,
                name
            })

            await this._devicesRepo.save(createDevice);

            return this.res.generateResponse(HttpStatus.OK, "Device created successfully", null, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllDevices(req:Request){
        try {

            const {data} = await this._api.getDeviceList()
            
            return this.res.generateResponse(HttpStatus.OK, "Devices List", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getDevicesByOS(os: string, req: Request){
        try {
            
            const {data} = await this._api.getDeviceListByOS(os)

            return this.res.generateResponse(HttpStatus.OK, "Devices List", data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }
}
