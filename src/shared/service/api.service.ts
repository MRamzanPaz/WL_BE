import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { catchError, lastValueFrom, map, tap } from 'rxjs';
import * as https from 'https'
import * as xmljs from 'xml-js';
@Injectable()
export class ApiService {
    constructor(
        private _http: HttpService
    ) { }

    // SYSTEM-MANDEEP-START

    async getDeviceList(){

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }

        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/device/list`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)

    }

    async getDeviceListByID(id: number){

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }

        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/device/list/${id}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)

    }

    async getDeviceListByOS(os: string){

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }

        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/device/os/${os}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)

    }

    async getPlanById(id: number) {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }

        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/${id}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)

    }

    async getAllProducts() {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
    
        const agent = new https.Agent({ rejectUnauthorized: false })
    
        const response = await this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/all`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )
    
        const data = await lastValueFrom(response);
        console.log('Fetched Products:', data); // Add this line to log the response data
    
        return data;
    }
    

    async requestProductOrder(body: any) {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.post(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/orders/request`, body, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)
    }

    async completeOrder(body: any) {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        // console.log(headers)
        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.post(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/orders/complete`, body, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response)
    }

    async validateEsim(iccid: string) {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/esim/validate/${iccid}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);

    }

    async activateEsim(body: any) {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.post(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/products/esim/activate`, body, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);

    }

    async getAllTopupPackages(iccid: string) {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false })

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/topup/packages/${iccid}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);
    }

    async applyBundle(data: any) {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false });

        const response = this._http.post(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/topup/apply`, data, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);
    }

    async getEsimDetails(iccid: string) {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false });

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/whitelabel-dashboard/esims/details/${iccid}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);
    }

    async getDevices() {

        const headers = {
            Accept: 'application/json',
            Authorization: process.env.AIRALO_TOKEN
        }

        const response = this._http.get(process.env.AIRALO_URL, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);

    }

    async getAllCountryList() {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false });
        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/whitelabel-dashboard/countries`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    console.log(e);
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);
    }

    async getAllTopupOrders() {

        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false });
        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/topup`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);

    }

    async checkRefundStatus(order_id: string) {
        const headers = {
            Authorization: process.env.SYSTEM_MANDEEP_TOKEN
        }
        const agent = new https.Agent({ rejectUnauthorized: false });

        const response = this._http.get(`${process.env.SYSTEM_MANDEEP_ENDPOINT}/refund/partner/check/${order_id}`, { headers, httpsAgent: agent })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            );

        return await lastValueFrom(response);

    }

    // SYSTEM-MANDEEP-END

    // PAWA-PAY-START

    async getActiveConfig() {

        const headers = {
            Accept: 'application/json',
            Authorization: process.env.PAWA_PAY_AUTHORIZATION
        }

        const response = this._http.get(`${process.env.PAWA_PAY_ENDPOINT}/active-conf`, { headers })

        return await lastValueFrom(response);

    }

    async pawaPayCreateDeposit(payload: any) {
        // console.log(payload)
        const headers = {
            Accept: 'application/json',
            Authorization: process.env.PAWA_PAY_AUTHORIZATION
        }

        const response = this._http.post(`${process.env.PAWA_PAY_ENDPOINT}/deposits`, payload, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);

    }

    async pawapayDepositeDetails(deposit_id: any) {

        const headers = {
            Accept: 'application/json',
            Authorization: process.env.PAWA_PAY_AUTHORIZATION
        }

        const response = this._http.get(`${process.env.PAWA_PAY_ENDPOINT}/deposits/${deposit_id}`, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);

    }

    async submitPawaPayRefund(payload: any) {
        const headers = {
            Accept: 'application/json',
            Authorization: process.env.PAWA_PAY_AUTHORIZATION
        }

        const response = this._http.post(`${process.env.PAWA_PAY_ENDPOINT}/refunds`, payload, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);
    }

    async checkPawaPayRefundStatus(refundId: string) {
        const headers = {
            Accept: 'application/json',
            Authorization: process.env.PAWA_PAY_AUTHORIZATION
        }

        const response = this._http.get(`${process.env.PAWA_PAY_ENDPOINT}/refunds/${refundId}`, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )

        return await lastValueFrom(response);
    }
    // PAWA-PAY-END

    // PESAPA-START

    async getAuthToken() {

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        const body = {
            consumer_key: process.env.PESAPAL_CONSUMER_KEY,
            consumer_secret: process.env.PESAPAL_CONSUMER_SECRETE
        }

        const response = this._http.post(`${process.env.PESAPAL_ENDPOINT}/api/Auth/RequestToken`, body, { headers: headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )
        return await lastValueFrom(response);
    }

    async submitTransaction(body: any) {

        const { token } = await this.getAuthToken();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }

        const response = this._http.post(`${process.env.PESAPAL_ENDPOINT}/api/Transactions/SubmitOrderRequest`, body, { headers: headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )
        return await lastValueFrom(response);
    }

    async getTransactionStatus(order_tracking_id: string) {
        console.log(order_tracking_id);
        const { token } = await this.getAuthToken();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }

        const response = this._http.get(`${process.env.PESAPAL_ENDPOINT}/api/Transactions//GetTransactionStatus?orderTrackingId=${order_tracking_id}`, { headers: headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )
        return await lastValueFrom(response);
    }




    // PESAPAL-END

    // DPO-START

    async dpoCreateToken(body: any) {

        const headers = {
            'Accept': 'application/xml',
            "Content-Type": "application/xml",
        }

        const xmlBodyHead = `<?xml version="1.0" encoding="utf-8"?>`;
        const xmlBodyCore = xmljs.js2xml({ API3G: body }, { compact: true, ignoreComment: true, spaces: 4 })

        const xmlBody = `${xmlBodyHead}${xmlBodyCore}`;

        console.log(xmlBody);

        const response = this._http.post(`${process.env.DPO_ENDPOINT}`, xmlBody, { headers: headers })
            .pipe(
                tap(res => console.log(res)),
                catchError(e => {
                    console.log(e);
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => xmljs.xml2js(res.data, { compact: true, ignoreComment: true, alwaysChildren: true })),

            )
        return await lastValueFrom(response);
    }

    async dpoChargeToken(body: any) {

        const headers = {
            'Accept': 'application/xml',
            "Content-Type": "application/xml",
        }

        const xmlBodyHead = `<?xml version="1.0" encoding="utf-8"?>`;
        const xmlBodyCore = xmljs.js2xml({ API3G: body }, { compact: true, ignoreComment: true, spaces: 4 })

        const xmlBody = `${xmlBodyHead}${xmlBodyCore}`;

        // return xmlBody

        const response = this._http.post(`${process.env.DPO_ENDPOINT}?ID=${body.TransactionToken}`, xmlBody, { headers: headers })
            .pipe(
                catchError(e => {
                    console.log(e);
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => xmljs.xml2js(res.data, { compact: true, ignoreComment: true, alwaysChildren: true })),

            )
        return await lastValueFrom(response);

    }

    async dpoChargeMMOToken(body: any) {

        const headers = {
            'Accept': 'application/xml',
            "Content-Type": "application/xml",
        }

        const xmlBodyHead = `<?xml version="1.0" encoding="utf-8"?>`;
        const xmlBodyCore = xmljs.js2xml({ API3G: body }, { compact: true, ignoreComment: true, spaces: 4 })

        const xmlBody = `${xmlBodyHead}${xmlBodyCore}`;

        // return xmlBody

        const response = this._http.post(`${process.env.DPO_ENDPOINT}?ID=${body.TransactionToken}`, xmlBody, { headers: headers })
            .pipe(
                catchError(e => {
                    console.log(e);
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map((res) => {
                    return {
                        statusCode: res.data.slice(57, 60)
                    }
                })
            )
        return await lastValueFrom(response);

    }

    async dpoVerifyToken(body: any) {

        const headers = {
            'Accept': 'application/xml',
            "Content-Type": "application/xml",
        }

        const xmlBodyHead = `<?xml version="1.0" encoding="utf-8"?>`;
        const xmlBodyCore = xmljs.js2xml({ API3G: body }, { compact: true, ignoreComment: true, spaces: 4 })

        const xmlBody = `${xmlBodyHead}${xmlBodyCore}`;

        // return xmlBody

        const response = this._http.post(`${process.env.DPO_ENDPOINT}?ID=${body.TransactionToken}`, xmlBody, { headers: headers })
            .pipe(
                catchError(e => {
                    console.log(e);
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => xmljs.xml2js(res.data, { compact: true, ignoreComment: true, alwaysChildren: true }))
            )
        return await lastValueFrom(response);

    }

    // DPO-END
    // PAYSTACL-START

    async payStackInitializePayment(payload: any){

        const headers = {
            Authorization: `Bearer ${process.env.PAYSTACK_SK}`,
            'Cache-Control': 'no-cache',
            "Content-Type": "application/json",
        }

        const response = this._http.post(`${process.env.PAYSTACK_ENDPOINT}/transaction/initialize`, payload, {headers: headers}).
        pipe(
            catchError(e => {
                throw new HttpException(e.response.data, e.response.status);
            }),
            map(res => res.data) 
        )

        return await lastValueFrom(response);

    }
    
    async payStackVerifyPayment(reference: string){

        const headers = {
            Authorization: `Bearer ${process.env.PAYSTACK_SK}`,
            'Cache-Control': 'no-cache',
            "Content-Type": "application/json",
        }

        const response = this._http.get(`${process.env.PAYSTACK_ENDPOINT}/transaction/verify/${reference}`, {headers: headers}).
        pipe(
            catchError(e => {
                throw new HttpException(e.response.data, e.response.status);
            }),
            map(res => res.data) 
        )

        return await lastValueFrom(response);

    }


    // PAYSTACL-END

    // LeadDyno start

    async leaddynoCreatePurchase(payload: any) {
        // console.log(payload)
        const headers = {
            Accept: 'application/json',
        }

        console.log("leaddyo:", payload)

        const response = this._http.post(`${process.env.LEADDYNO_ENDPOINT}/purchases`, payload, { headers })
            .pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response.data, e.response.status);
                })
            )

        return await lastValueFrom(response);

    }

    async createAffiliate(payload: any) {
        console.log(payload)
        const headers = {
            Accept: 'application/json',
        }

        const response = this._http.post(`${process.env.LEADDYNO_ENDPOINT}/affiliates`, payload, { headers })
            .pipe(
                map((res) => res.data),
                catchError((e) => {
                    throw new HttpException(e.response.data, e.response.status);
                })

            )

        return await lastValueFrom(response);

    }

    async getAffiliateUrlByEmail(email: any) {

        const headers = {
            Accept: 'application/json'
        }

        const response = this._http.get(`${process.env.LEADDYNO_ENDPOINT}/affiliates/by_email?email=${email}&key=${process.env.PRIVATE_KEY}`, { headers })
            .pipe(
                catchError(e => {
                    throw new HttpException(e.response.data, e.response.status);
                }),
                map(res => res.data)
            )
        return await lastValueFrom(response);
    }

    // LeadDyno end

    // screenly Verify Email start

    async verifyEmail(email: any) {
        const headers = {
            'x-api-key': 'prod_3e4f8c08-2fce-4bb7-b6de-35af08051962',
            'CorrelationId': '3a78b70b-b74e-4059-b9d5-2d76ccd079ce',
            'Accept': 'application/json',
        }

        const payload = {
            Email: email,
            FixTypos: false
        }

        const response = this._http.post(`${process.env.SCREENLY_ENDPOINT}/email-validate`, payload, { headers })
            .pipe(
                map((res) => res.data),
                catchError((e) => {
                    console.log(e)
                    throw new HttpException(e.response.data, e.response.status);
                })

            )

        return await lastValueFrom(response);
    }

    // screenly Verify Email end
}
