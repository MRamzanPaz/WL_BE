import { Controller, Get, Inject, Request } from '@nestjs/common';
import { ReportService } from './report.service';
import { Request as request } from 'express';

@Controller('report')
export class ReportController {
    constructor(
        @Inject('REPORT-SERVICE') private _report: ReportService
    ) { }

    @Get('accounting/setup')
    getAccountingReport(@Request() req: request) {
        return this._report.generateAccountingReport(req);
    }

    @Get('accounting/all')
    getReport(@Request() req: request) {
        return this._report.getReport(req);
    }


}
