import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ActivatedESims } from 'src/entities/activatedEsim.entity';
import { ApiService } from 'src/shared/service/api.service';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Repository } from 'typeorm';
import { ActivationDto } from './sim_activation.dto';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class SimActivationService {

    constructor(
        @InjectRepository(ActivatedESims) private readonly _activateEsimRepo: Repository<ActivatedESims>,
        @InjectRepository(Customers)
        private readonly _customerRepo: Repository<Customers>,
        @InjectRepository(CustomerWallet)
        private readonly _customerWalletRepo: Repository<CustomerWallet>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        private _mail: MailService
    ){}

    async validateEsim( iccid: string, req: Request  ){

        try {
            
            const isAlreadyAssign = await this._activateEsimRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    iccid: iccid
                }
            })

            if(isAlreadyAssign){

                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Iccid is already assign!", null, req)

            }

            const isValidEsim = await this._api.validateEsim(iccid);

            return isValidEsim;


        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    async activateEsim(body: ActivationDto, req: Request){

        try {
            
            const { iccid } = body;

            const isAlreadyAssign = await this._activateEsimRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    iccid: iccid
                }
            })

            if(isAlreadyAssign){

                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Iccid is already assign!", null, req)

            }

            const customer = await this.createCustomer(body);

            const { code , message, data} = await this._api.activateEsim({iccid});

            if(code != 200){
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, message, null, req)
            }

            const createRecord = await this._activateEsimRepo.create({
                iccid: iccid,
                customer: customer,
                singleUse: data.singleUse
            })

            await this._activateEsimRepo.save(createRecord);


            return this.res.generateResponse(HttpStatus.OK, "Iccid Is activated successfully!", [], req)

        } catch (error) {
            return this.res.generateError(error, req);
        }

    }

    private async createCustomer(body: ActivationDto){

        const { firstname, lastname, email } = body;

            const customer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    email: email.trim()
                },
                relations: {
                    wallet: true
                },
                select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    email: true,
                }
            })

            if(customer){

                return customer;
            }

            const tempPass = `${firstname.trim()}123456`

            const salt = await bcrypt.genSalt(10);
            const hashPass = await bcrypt.hash(tempPass, salt);

            const payLoad: Customers | any = {
                firstname: firstname,
                lastname: lastname,
                email: email.trim(),
                password: hashPass
            }

            const createCustomer: any = this._customerRepo.create(payLoad);
            await this._customerRepo.save(createCustomer)

            const createWallet = this._customerWalletRepo.create({
                wallet_balance: 0
            })
            await this._customerWalletRepo.save(createWallet)

            await this._customerRepo.createQueryBuilder('Customers')
            .update()
            .set({
                wallet: createWallet
            })
            .where("id = :id", {id: createCustomer.id})
            .execute()

            const createdCustomer = await this._customerRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: createCustomer.id
                },
                relations: {
                    wallet: true
                },
                select: {
                    id: true,
                    firstname: true,
                    lastname: true,
                    email: true,
                }
            })

            const emailData = {
                to: email,
                customer_name: firstname + ' ' + lastname,
                customer_email: email,
                customer_pass: tempPass
            }

            await this._mail.sendCustomerEmail(emailData)

            return createdCustomer;

    }

}
