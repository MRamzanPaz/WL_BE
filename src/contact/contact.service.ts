import { HttpStatus, Inject, Injectable, Body } from '@nestjs/common';
import { AffiliateDto, ContactUsDto, PaginationDto, ResellerDto } from './contact.dto';
import { ResponseService } from 'src/shared/service/response.service';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact } from 'src/entities/contact.entity';
import { IsNull, Like, Repository } from 'typeorm';
import { Affiliate } from 'src/entities/affiliate.entity';
import { Reseller } from 'src/entities/reseller.entity';
import { MailService } from 'src/mail/mail.service';
import { ApiService } from 'src/shared/service/api.service';

@Injectable()
export class ContactService {
    constructor(
        @InjectRepository(Contact) private _contactRepo: Repository<Contact>,
        @InjectRepository(Affiliate) private _affiliateRepo: Repository<Affiliate>,
        @InjectRepository(Reseller) private _resellerRepo: Repository<Reseller>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService,
        @Inject('API-SERVICE') private _api: ApiService,
        private _mail: MailService,
    ) { }

    async createContact(body: ContactUsDto, req: Request) {
        try {
            // console.log('fired !!!');
            const payload = {
                ...body
            }
            const createContact = this._contactRepo.create(payload);
            await this._contactRepo.save(createContact);

            const emailData = {
                subject: body.subject,
                customer_name: body.firstName + ' ' + body.lastName,
                customer_email: body.email,
                concerning: body.concerning,
                message: body.message
            }

            this._mail.sendCustomerContactEmail(emailData);

            return this.res.generateResponse(HttpStatus.OK, "Contact save successfully!", null, req);
        }
        catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllContact(req: Request) {
        try {

            const findAll = await this._contactRepo.find({
                where: {
                    deleted_at: IsNull()
                },
            })

            return this.res.generateResponse(HttpStatus.OK, "Contact List", findAll, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async getAllContactWithPagination(param: PaginationDto, req: Request) {
        try {
            const { searchStr, page, pageSize } = param;


            const findAll = await this._contactRepo.find({
                where: [
                    { email: Like(`%${searchStr}`), deleted_at: IsNull() },
                ],
                skip: (page - 1) * pageSize,
                take: pageSize,
            })

            const totalcount = await this._contactRepo.count({
                where: [
                    { email: Like(`%${searchStr}%`), deleted_at: IsNull() }
                ],
            })

            const data = {
                list: findAll,
                total_count: totalcount,
                page,
                pageSize
            }
            return this.res.generateResponse(HttpStatus.OK, "Contact List With Pagination", data, req);

        } catch (error) {
            this.res.generateError(error, req)
        }
    }

    async getContactById(id: string, req: Request) {
        try {
            const contactById = await this._contactRepo.findOne({
                where: {
                    id: parseInt(id)
                }
            })

            if (!contactById) {
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Contact not found!", null, req);
            }

            return this.res.generateResponse(HttpStatus.OK, "success", contactById, req)

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async createAffiliate(body: AffiliateDto, req: Request) {
        try {
            const { fullName, email, phone, companyName } = body
            // console.log(payload);

            let affiliatePayload = {
                key: process.env.PRIVATE_KEY,
                email: email,
            }
            const getAffiliateUrl = await this._api.createAffiliate(affiliatePayload);
            let affiliteURL = getAffiliateUrl?.affiliate_url;
            let affiliate_dashboard_url = getAffiliateUrl?.affiliate_dashboard_url;

            let payload = {
                fullName: fullName,
                email: email,
                phone: phone,
                companyName: companyName,
                affiliateUrl: affiliteURL
            }

            const createAffiliate = this._affiliateRepo.create(payload)

            await this._affiliateRepo.save(createAffiliate);

            const emailData = {
                to: email,
                customer_name: fullName,
                customer_email: email,
                affiliate_url: affiliteURL,
                affiliate_dashboard_url: affiliate_dashboard_url
            }

            this._mail.sendCustomerAffiliateEmail(emailData);

            return this.res.generateResponse(HttpStatus.OK, "Affiliate save successfully!", null, req);


        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllAffiliate(req: Request) {
        try {

            const findAll = await this._affiliateRepo.find({
                where: {
                    deleted_at: IsNull()
                },
            })

            return this.res.generateResponse(HttpStatus.OK, "Affiliate Form List", findAll, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }

    async createReseller(body: ResellerDto, req: Request) {
        try {
            const { fullName, email, phone, companyName, country } = body

            const createReseller = this._resellerRepo.create({
                fullName,
                email,
                phone,
                companyName,
                country
            })

            await this._resellerRepo.save(createReseller);
            return this.res.generateResponse(HttpStatus.OK, "Reseller save successfully!", null, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async getAllReseller(req: Request) {
        try {

            const findAll = await this._resellerRepo.find({
                where: {
                    deleted_at: IsNull()
                },
            })

            return this.res.generateResponse(HttpStatus.OK, "Reseller Forms List", findAll, req);

        } catch (error) {
            return this.res.generateError(error, req);
        }
    }




}
