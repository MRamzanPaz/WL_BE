import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Customers } from 'src/entities/customer.entity';
import { CustomerWallet } from 'src/entities/customer_wallet.entity';
import { CustomerWalletHistory } from 'src/entities/customer_wallet_history.entity';
import { IsNull, Repository } from 'typeorm';
import convertor from 'convert-string-to-number';
import { StripeCreateTokenDto } from '../dtos/stripeCreateToken.dto';
import Stripe from 'stripe';
import * as generator from 'otp-generator';
import * as Flutterwave from 'flutterwave-node-v3';
import * as currencyConvertor from 'currency-converter-lt';
import * as uuid from 'uuid';
import { HttpService } from '@nestjs/axios';
import { catchError, lastValueFrom, map } from 'rxjs';
import * as crypto from 'crypto';
import { ApiService } from './api.service';
import { TopupOrders } from 'src/entities/topup-orders.entity';
import { EsimOrders } from 'src/entities/esim-orders.entity';

@Injectable()
export class GeneralService {

  private readonly STRIPE = new Stripe(process.env.STRIPE_PUBLISH_KEY, { apiVersion: '2020-08-27' });
  private readonly STRIPE_SECRET = new Stripe(process.env.STRIPE_SECRETE_KEY, { apiVersion: '2020-08-27' });
  private readonly FLUTTERWAVE = new Flutterwave(process.env.FLUTTER_WAVE_PK, process.env.FLUTTER_WAVE_SK);

  constructor(
    @InjectRepository(Customers)
    private readonly _customerRepo: Repository<Customers>,
    @InjectRepository(CustomerWallet)
    private readonly _customerWalletRepo: Repository<CustomerWallet>,
    @InjectRepository(CustomerWalletHistory)
    private readonly _customerWalletHisRepo: Repository<CustomerWalletHistory>,
    private _http: HttpService,
    @Inject('API-SERVICE') private _api: ApiService
  ) { }

  async verifyCustomer(decodedToken: any, token: string) {
    let ret = false;
    const { id } = decodedToken;
    const isValid = await this._customerRepo
      .createQueryBuilder('Customers')
      .where('id = :id AND auth_token = :token', { id: id, token })
      .getOne();

    if (isValid) {
      ret = true;
    }
    return ret;
  }

  async performWalletTransaction(order: TopupOrders | EsimOrders | any, amount: number, msg: string) {
    let ret: any = false;

    const customer = await this._customerRepo.findOne({
      where: {
        id: order.customer.id,
        deleted_at: IsNull(),
      },
      relations: {
        wallet: true,
      },
    });

    // update customer wallet
    const _floatAmount = convertor(customer.wallet.wallet_balance);

    if (_floatAmount > amount) {

      const updatedAmount = _floatAmount - amount;
      await this._customerWalletRepo
        .createQueryBuilder('CustomerWallet')
        .update()
        .set({
          wallet_balance: updatedAmount,
        })
        .where('id = :id', { id: customer.wallet.id })
        .execute();

      // create wallet history
      const walletHistory = this._customerWalletHisRepo.create({
        message: msg,
        debit: amount,
        wallet_id: customer.wallet,
        transaction: order.transaction
      });

      await this._customerWalletHisRepo.save(walletHistory);
      ret = true;

    }
    return ret;
  }

  async createStripToken(payload: StripeCreateTokenDto) {

    try {

      const { card_cvc, card_month, card_number, card_year } = payload;

      const createToken = await this.STRIPE.tokens.create({
        card: {
          number: card_number,
          exp_month: card_month,
          exp_year: card_year,
          cvc: card_cvc
        }
      })

      return createToken.id

    } catch (error) {

      return null;

    }

  }

  async createFwCardIntent(transaction_payload: any) {

    const { card_number, card_cvc, card_month, card_year, token, amount, customer_email, cardHolder_fullname } = transaction_payload;

    // const USD_NGN_Conversion = new currencyConvertor({from:"USD", to:"NGN", amount:parseFloat(amount)})
    // const convertedAmount = await USD_NGN_Conversion.convert()

    const fwCardIntent = await this.FLUTTERWAVE.Charge.card({
      card_number: card_number,
      cvv: card_cvc,
      expiry_month: card_month,
      expiry_year: card_year,
      currency: 'USD',
      amount: amount,
      email: customer_email,
      fullname: cardHolder_fullname,
      tx_ref: token,
      enckey: process.env.FLUTTER_WAVE_EK
    });

    console.log(fwCardIntent);

    return fwCardIntent;

  }

  async authorizedFWCard(payload: any) {

    const { card_number, card_cvc, card_month, card_year, token, amount, customer_email, cardHolder_fullname, authorization } = payload;

    // const USD_NGN_Conversion = new currencyConvertor({from:"USD", to:"NGN", amount:parseFloat(amount)})
    // const convertedAmount = await USD_NGN_Conversion.convert()

    const fwCardIntent = await this.FLUTTERWAVE.Charge.card({
      card_number: card_number,
      cvv: card_cvc,
      expiry_month: card_month,
      expiry_year: card_year,
      currency: 'USD',
      amount: amount,
      email: customer_email,
      fullname: cardHolder_fullname,
      tx_ref: token,
      enckey: process.env.FLUTTER_WAVE_EK,
      authorization: authorization
    })

    return fwCardIntent;

  }

  async validateFWCard(payload: any) {

    const validation = await this.FLUTTERWAVE.Charge.validate({
      // otp: req.body.otp,
      // flw_ref: req.session.flw_ref
      ...payload
    });

    return validation
  }

  generateTransactionRef(card?) {

    let tx_ref = null;

    tx_ref = generator.generate(20, {
      digits: true,
      lowerCaseAlphabets: true,
      upperCaseAlphabets: true,
      specialChars: false
    })

    tx_ref = card ? `FW-CARD-${tx_ref}` : `MOBILE-${tx_ref}`;

    return tx_ref;

  }

  generateDepositId() {
    const depositId = uuid.v4();
    return depositId;
  }

  async generateDPOToken(payload: any): Promise<string> {
    const response: any = await this._api.dpoCreateToken(payload);
    return response.API3G.TransToken._text;
  }


  generatePawaPayaRefundId() {
    const refundId = uuid.v4();
    return refundId;
  }

  async createMobileMoneyPaymentIntent(data: any) {

    const { currency } = data;

    let ret: any;

    switch (currency) {
      case 'KES':
        ret = await this.createMPesaIntent(data)
        break;
      case 'GHS':
        ret = await this.createGhanaIntent(data)
        break;
      case 'UGX':
        ret = await this.createUgandaIntent(data)
        break;
      case 'RWF':
        ret = await this.createRwandaIntent(data)
        break;
      case 'ZMW':
        ret = await this.createZambiaIntent(data)
        break;
      case 'TZS':
        ret = await this.createTanzaniaIntent(data)
        break;
      default:
        break;
    }

    return ret

  }

  async createMPesaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "KES", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert()

    // console.log("usd", data.amount)
    // console.log("kes", amount)
    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'KES',
      email: data.email,
      tx_ref: data.tx_ref
    }

    const mPesaIntent = await this.FLUTTERWAVE.MobileMoney.mpesa(payload)

    const { status } = mPesaIntent;

    if (status == "success") {

      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: false,
          redirectUrl: null,
          msg: 'Please approved payment from Mpesa app'
        }
      }
      return ret
    } else {

      throw new HttpException(mPesaIntent.message, HttpStatus.BAD_REQUEST)
    }
  }

  async createGhanaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "GHS", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert()

    // console.log("usd", data.amount)
    // console.log("GHS", amount)

    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'GHS',
      network: data.network,
      email: data.email,
      tx_ref: data.tx_ref,
      voucher: 0
    }

    const ghanaIntent = await this.FLUTTERWAVE.MobileMoney.ghana(payload)
    const { status, meta } = ghanaIntent;

    if (status == "success") {
      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: true,
          redirectUrl: meta.authorization.redirect,
          msg: 'Please provide us otp code'
        }
      }
      return ret
    } else {

      throw new HttpException(ghanaIntent.message, HttpStatus.BAD_REQUEST)
    }
  }

  async currencyConverter(currency: string, _amount: any) {
    if (currency === "USD") {
      // const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: currency, amount: parseFloat(_amount) })

      const USD_KES_Conversion = new currencyConvertor({ from: "KES", to: currency, amount: parseFloat(_amount) })
      let amount = await USD_KES_Conversion.convert();
      return amount;

    }
    else {

      const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: currency, amount: _amount })
      let amount = await USD_KES_Conversion.convert()
      return amount;

    }
  }

  async currencyConvertorV2(currency: string, _amount: number) {
    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: currency, amount: _amount })
    let amount = await USD_KES_Conversion.convert()
    return amount;
  }

  async createUgandaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "UGX", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert()

    // console.log("usd", data.amount)
    // console.log("UGX", amount)

    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'UGX',
      network: data.network,
      email: data.email,
      tx_ref: data.tx_ref
    }

    const ugandaIntent = await this.FLUTTERWAVE.MobileMoney.uganda(payload)
    const { status, meta } = ugandaIntent;

    if (status == "success") {
      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: true,
          redirectUrl: meta.authorization.redirect,
          msg: 'Please provide us otp code'
        }
      }
      return ret
    } else {

      throw new HttpException(ugandaIntent.message, HttpStatus.BAD_REQUEST)
    }
  }


  async createRwandaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "RWF", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert();
    //  console.log("usd", data.amount)
    // console.log("RWF", amount)

    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'RWF',
      email: data.email,
      tx_ref: data.tx_ref,
      order_id: data.tx_ref
    }

    const rwandaIntent = await this.FLUTTERWAVE.MobileMoney.rwanda(payload)
    const { status, meta } = rwandaIntent;

    if (status == "success") {
      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: true,
          redirectUrl: meta.authorization.redirect,
          msg: 'Please provide us otp code'
        }
      }
      return ret
    } else {

      throw new HttpException(rwandaIntent.message, HttpStatus.BAD_REQUEST)
    }
  }

  async createZambiaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "ZMW", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert();
    //  console.log("usd", data.amount)
    // console.log("ZMW", amount)

    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'ZMW',
      email: data.email,
      tx_ref: data.tx_ref,
      order_id: data.tx_ref,
      network: data.network,
    }

    const zambiaIntent = await this.FLUTTERWAVE.MobileMoney.rwanda(payload)
    const { status, meta } = zambiaIntent;

    if (status == "success") {
      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: true,
          redirectUrl: meta.authorization.redirect,
          msg: 'Please provide us otp code'
        }
      }
      return ret
    } else {

      throw new HttpException(zambiaIntent.message, HttpStatus.BAD_REQUEST)
    }
  }

  async createTanzaniaIntent(data: any) {

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "TZS", amount: parseFloat(data.amount) })

    let amount = await USD_KES_Conversion.convert();
    //  console.log("usd", data.amount)
    // console.log("ZMW", amount)

    const payload = {
      phone_number: data.phone_number,
      amount: amount,
      currency: 'TZS',
      email: data.email,
      tx_ref: data.tx_ref,
      order_id: data.tx_ref,
      network: data.network,
    }

    const response = this._http.post('https://api.flutterwave.com/v3/charges?type=mobile_money_tanzania', payload, {
      headers: {
        Authorization: 'Bearer ' + process.env.FLUTTER_WAVE_SK
      }
    })
      .pipe(map(res => res.data), catchError((err) => { throw new HttpException(err.message, HttpStatus.BAD_REQUEST) }))

    let { status, } = await lastValueFrom(response);

    if (status == "success") {
      const ret = {
        code: 1,
        data: {
          tr_ref: data.tx_ref,
          redirect: false,
          redirectUrl: null,
          msg: 'Please approved your payment!'
        }
      }
      return ret
    }
  }

  async getElipaResource(data: any) {
    // const { country_iso3 } = data;

    let resource = await this.elipaKenya(data);
    // switch (country_iso3) {
    //   case "KEN":
    //     resource = await this.elipaKenya(data);
    //     break;
    //   case "UGA":
    //     resource = await this.elipaUganda(data);
    //     break;
    //   case "MWI":
    //     resource = await this.elipaMalawi(data);
    //     break;
    //   case "SOM":
    //     resource = await this.elipaSomalia(data);
    //     break;
    //   case 'TZA':
    //     resource = await this.elipaTanzia(data)
    //     break;
    //   case 'ZMB':
    //     resource = await this.elipaZambia(data)
    //     break;
    //   default:
    //     break;
    // }

    return resource;
  }

  async elipaKenya(data: any) {

    console.log("=============", data);
    const { amount, customer_email, phone_number, order_no, token, type, country_iso3 } = data;

    if (country_iso3 == 'KEN_MM') {

      const ORDER_ID = order_no
      const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "KES", amount: amount })
      const convertedAmount = await USD_KES_Conversion.convert();
      const finalAmount = convertedAmount.toFixed(0);
      const paramsStr = process.env.ELIPA_LIVE + ORDER_ID + `inv-${ORDER_ID}` + finalAmount + phone_number + customer_email + process.env.ELIPA_VID + "KES" + `${process.env.ELIPA_REDIRECT_URL}?transaction_token=${token}&type=${type}&method=elipa` + "1" + "2";

      console.log(process.env.ELIPA_VID);
      //generating the key
      var hashstring = crypto
        .createHmac("sha1", process.env.ELIPA_HASHKEY)
        .update(paramsStr)
        .digest("hex");

      const params = new URLSearchParams({
        live: process.env.ELIPA_LIVE,
        creditcard: '0',
        unionpay: '0',
        // mpesa: '0',
        // bonga: '0',
        // airtel: '0',
        // equity: '0',
        // mvisa: '0',
        // vooma: '0',
        // pesalink: '0',
        oid: ORDER_ID,
        inv: `inv-${ORDER_ID}`,
        ttl: finalAmount,
        tel: phone_number,
        eml: customer_email,
        vid: process.env.ELIPA_VID,
        curr: "KES",
        cbk: `${process.env.ELIPA_REDIRECT_URL}?transaction_token=${token}&type=${type}&method=elipa`,//call-back
        cst: "1",
        crl: "2",
        hsh: hashstring,
      }).toString();

      const redirect_URL = `${process.env.ELIPA_KENYA_ENDPOINT}/ke?${params}`

      const resource = {
        redirect: true,
        redirect_URL: redirect_URL,
        sdk: false,
        sdk_source: null,
        tr_ref: token,
        currency: 'KES'
      }

      return resource;
    }

    if (country_iso3 == 'KEN_CC') {
      const ORDER_ID = order_no
      const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "KES", amount: amount })
      // const convertedAmount = await USD_KES_Conversion.convert();

      const paramsStr = process.env.ELIPA_LIVE + ORDER_ID + `inv-${ORDER_ID}` + amount + phone_number + customer_email + process.env.ELIPA_VID + "USD" + `${process.env.ELIPA_REDIRECT_URL}?transaction_token=${token}&type=${type}&method=elipa` + "1" + "2";

      console.log(process.env.ELIPA_VID);
      //generating the key
      var hashstring = crypto
        .createHmac("sha1", process.env.ELIPA_HASHKEY)
        .update(paramsStr)
        .digest("hex");

      const params = new URLSearchParams({
        live: process.env.ELIPA_LIVE,
        // creditcard: '0',
        // unionpay: '0',
        mpesa: '0',
        bonga: '0',
        airtel: '0',
        equity: '0',
        mvisa: '0',
        vooma: '0',
        pesalink: '0',
        oid: ORDER_ID,
        inv: `inv-${ORDER_ID}`,
        ttl: amount,
        tel: phone_number,
        eml: customer_email,
        vid: process.env.ELIPA_VID,
        curr: "USD",
        cbk: `${process.env.ELIPA_REDIRECT_URL}?transaction_token=${token}&type=${type}&method=elipa`,//call-back
        cst: "1",
        crl: "2",
        hsh: hashstring,
      }).toString();

      const redirect_URL = `${process.env.ELIPA_KENYA_ENDPOINT}/ke?${params}`

      const resource = {
        redirect: true,
        redirect_URL: redirect_URL,
        sdk: false,
        sdk_source: null,
        tr_ref: token,
        currency: 'USD'
      }

      return resource;
    }


  }

  async elipaUganda(data: any) {

    console.log("=============", data);
    const { amount, customer_email, phone_number, order_no } = data;

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "UGX", amount: amount })
    const convertedAmount = await USD_KES_Conversion.convert();
    const ORDER_ID = order_no.replace('-', '');

    const paramsStr = process.env.ELIPA_LIVE + ORDER_ID + convertedAmount + phone_number + customer_email + process.env.ELIPA_VID + "UGX" + `${process.env.ELIPA_REDIRECT_URL}?order_no=${order_no}&type=ORDER&gateway=elipa` + "1" + "2";

    console.log(process.env.ELIPA_VID);
    //generating the key
    var hashstring = crypto
      .createHmac("sha1", process.env.ELIPA_HASHKEY)
      .update(paramsStr)
      .digest("hex");

    const params = new URLSearchParams({
      live: process.env.ELIPA_LIVE,
      oid: ORDER_ID,
      ttl: convertedAmount,
      tel: phone_number,
      eml: customer_email,
      vid: process.env.ELIPA_VID,
      curr: "UGX",
      cbk: `${process.env.ELIPA_REDIRECT_URL}?order_no=${order_no}&type=ORDER&gateway=elipa`,//call-back
      cst: "1",
      crl: "2",
      hsh: hashstring,
    }).toString();

    const redirect_URL = `${process.env.ELIPA_UGANDA_ENDPOINT}?${params}`

    const resource = {
      redirect: true,
      redirect_URL: redirect_URL,
      sdk: false,
      sdk_source: null,
      transaction_ref: `${ORDER_ID}-${hashstring}`,
      currency: 'UGX'
    }

    return resource;


  }

  async elipaMalawi(data: any) {

    console.log("=============", data);
    const { amount, customer_email, phone_number, order_no } = data;

    const USD_KES_Conversion = new currencyConvertor({ from: "USD", to: "MWK", amount: amount })
    const convertedAmount = await USD_KES_Conversion.convert();
    const ORDER_ID = order_no.replace('-', '');


    const payload = {
      amount: convertedAmount,
      currency: "MWK",
      email: customer_email,
      phone: phone_number,
      reference: ORDER_ID,
      vid: process.env.ELIPA_VID,
      cbk: `${process.env.ELIPA_REDIRECT_URL}?order_no=${order_no}&type=ORDER&gateway=elipa`,//call-back
    }

    const sortedFields = Object.keys(payload).sort().reduce((acc, key) => {
      acc[key] = payload[key];
      return acc;
    }, {});

    const dataString = new URLSearchParams(sortedFields).toString();
    const hashKey = 'demo';

    const hash = crypto.createHmac('sha256', hashKey).update(dataString).digest('hex');
    payload['hash'] = hash;

    const fetchRedirectUrl = this._http.post(`${process.env.ELIPA_MALAWI_ENDPOINT}/payments/v2/payin/session/create/mw`, payload, { headers: { 'Content-Type': 'application/json' } })

    const res = await lastValueFrom(fetchRedirectUrl);

    console.log(res);

    const redirect_URL = res.data.redirect_url

    const resource = {
      redirect: true,
      redirect_URL: redirect_URL,
      sdk: false,
      sdk_source: null,
      transaction_ref: `${ORDER_ID}-${hash}`,
      currency: 'UGX'
    }

    return resource;


  }

  async elipaSomalia(data: any) {

    const ORDER_ID = data.order_no.replace('-', '');

    const headers = {
      'Access-Control-Allow-Origin': "*"
    }
    let sdkResponse: any = this._http.get(process.env.ELIPA_SOMALIA_SDK, { headers });
    sdkResponse = await lastValueFrom(sdkResponse);
    const loadSDK = sdkResponse.data;

    const resource = {
      redirect: false,
      redirect_URL: null,
      sdk: true,
      sdk_source: loadSDK,
      transaction_ref: ORDER_ID,
      currency: 'SOS',
      country: 'so'
    }

    return resource;
  }

  async elipaTanzia(data: any) {

    const ORDER_ID = data.order_no.replace('-', '');

    const headers = {
      'Access-Control-Allow-Origin': "*"
    }
    let sdkResponse: any = this._http.get(process.env.ELIPA_SOMALIA_SDK, { headers });
    sdkResponse = await lastValueFrom(sdkResponse);
    const loadSDK = sdkResponse.data;

    console.log(loadSDK);

    const resource = {
      redirect: false,
      redirect_URL: null,
      sdk: true,
      sdk_source: loadSDK,
      transaction_ref: ORDER_ID
    }

    return resource;

  }

  async elipaZambia(data: any) {

    const ORDER_ID = data.order_no.replace('-', '');

    const headers = {
      'Access-Control-Allow-Origin': "*"
    }
    let sdkResponse: any = this._http.get(process.env.ELIPA_ZAMBIA_SDK, { headers });
    sdkResponse = await lastValueFrom(sdkResponse);
    const loadSDK = sdkResponse.data;

    const resource = {
      redirect: false,
      redirect_URL: null,
      sdk: true,
      sdk_source: loadSDK,
      transaction_ref: ORDER_ID
    }

    return resource;

  }

  async verifyElipaPayment(data: any) {

    const { country_code } = data;
    let ret = false;
    switch (country_code) {
      case 'KEN':
        ret = await this.verifyElipaKenya(data);
        break;

      default:
        break;
    }

    return ret;
  }

  async verifyElipaKenya(data: any) {

    const { status } = data

    console.log(data);
    if (status == 'aei7p7yrx4ae34') {
      return true
    } else {
      return false;
    }

  }

  public async getStripeTransFees(id: string): Promise<any> {

    const chTokenData = await this.STRIPE_SECRET.charges.retrieve(id);

    const transToken = chTokenData?.balance_transaction.toString();

    const transTokenData = await this.STRIPE_SECRET.balanceTransactions.retrieve(transToken)

    const transFeeWithCent = transTokenData?.fee

    const transFeeWithoutCent = transFeeWithCent / 100;

    console.log(typeof transFeeWithoutCent);

    return transFeeWithoutCent;
  }

}
