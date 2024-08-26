import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FAQ } from 'src/entities/faq.entity';
import { ResponseService } from 'src/shared/service/response.service';
import { IsNull, Like, Repository } from 'typeorm';
import { AddFaqDto, PaginationDto, UpdateDto } from './faq.dto';
import { Request } from 'express';

@Injectable()
export class FaqService {

    constructor(
        @InjectRepository(FAQ) private _faqRepo: Repository<FAQ>,
        @Inject("RESPONSE-SERVICE") private res: ResponseService
    ){}

    async addQuestion(body: AddFaqDto, req: Request){

        try {
            
            const { question, answer } = body;

            const createFaq = this._faqRepo.create({
                question: question,
                answer: answer
            })

            await this._faqRepo.save(createFaq);

            return this.res.generateResponse(HttpStatus.OK, "FAQ added successfully!", [], req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async updateQuestion(body: UpdateDto, req: Request){
        try {
            
            const { id, question, answer } = body;

            const findOne = await this._faqRepo.findOne({
                where: {
                    id: id,
                    deleted_at: IsNull()
                }
            })

            if(!findOne){
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Ivalid faq id", findOne, req);
            }

            await this._faqRepo.createQueryBuilder('FAQ')
            .update()
            .set({
                question: question,
                answer: answer
            })
            .where("id = :id", {id: id})
            .execute()

            return this.res.generateResponse(HttpStatus.OK, "FAQ updated!", [], req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

    async deleteQuestion(id: string, req: Request){

        try {
            
            const findOne = await this._faqRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: parseInt(id)
                }
            })

            if(!findOne){
                return this.res.generateResponse(HttpStatus.BAD_REQUEST, "Faq not found", null, req)
            }

            await this._faqRepo.createQueryBuilder('FAQ')
            .update()
            .set({
                deleted_at: new Date()
            })
            .where("id = :id", {id: parseInt(id)})
            .execute()

            return this.res.generateResponse(HttpStatus.OK, "Faq deleted!", null, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getFaqById(id: string, req: Request){

        try {
            
            const findOne = await this._faqRepo.findOne({
                where: {
                    deleted_at: IsNull(),
                    id: parseInt(id)
                }
            })

            if(!findOne){
                return this.res.generateResponse(HttpStatus.BAD_GATEWAY, "Ivalid faq id", null, req)
            }

            return this.res.generateResponse(HttpStatus.OK, "FAQ's", findOne, req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllFaq(req: Request){

        try {
            
            const findAll = await this._faqRepo.find({
                where: {
                    deleted_at: IsNull()
                }
            })

            return this.res.generateResponse(HttpStatus.OK, "FAQ list", findAll,req);

        } catch (error) {
            return this.res.generateError(error, req)
        }

    }

    async getAllFaqBypagination(query: PaginationDto, req: Request){
        try {

            // console.log(req)

            const { page, pageSize, searchStr } = query;

            const findAll = await this._faqRepo.find({
                where: {
                    question: Like(`%${searchStr}%`),
                    deleted_at: IsNull()
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            })

            const count = await this._faqRepo.count({
                where: {
                    // question: Like(`%${searchStr}%`),
                    deleted_at: IsNull()
                }
            })

            const data = {
                page: page,
                pageSize: pageSize,
                list: findAll,
                total_count: count
            }
            // console.log(req.originalUrl)
            return this.res.generateResponse(HttpStatus.OK, "Faq List",data, req)

        } catch (error) {
            return this.res.generateError(error, req)
        }
    }

}
