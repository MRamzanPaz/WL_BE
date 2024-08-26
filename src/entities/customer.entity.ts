import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EsimOrders } from "./esim-orders.entity";
import { CustomerWallet } from "./customer_wallet.entity";
import { ActivatedESims } from "./activatedEsim.entity";
import { TopupOrders } from "./topup-orders.entity";


@Entity()
export class Customers{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false
    })
    firstname: string;

    @Column({
        default: null,
        nullable: false
    })
    lastname: string;

    @Column({
        default: null,
        nullable: false,
    })
    email: string;

    @Column({
        default: null,
        nullable: true,
        type: 'longtext'
    })
    auth_token: string;

    @Column({
        default: null,
        nullable: false
    })
    password: string;

    @Column({
        default: null,
        nullable: true
    })
    otp_code: string;

    @Column({
        default: null,
        nullable: true
    })
    middle_name: string;

    @Column({
        default: null,
        nullable: true
    })
    country_of_residence: string;

    @Column({
        default: null,
        nullable: true
    })
    address_detail: string;

    @Column({
        default: null,
        nullable: true
    })
    address_detail_usa: string;

    @Column({
        default: null,
        nullable: true
    })
    phone_number: string;

    @OneToMany(() => EsimOrders, (order) => order.customer)
    orders: EsimOrders[];

    @OneToMany(() => TopupOrders, (order) => order.customer)
    topups: TopupOrders[];

    @OneToMany(() => ActivatedESims, (activated) => activated.customer)
    activated_esims: ActivatedESims[]

    @OneToOne(() => CustomerWallet)
    @JoinColumn({name: 'wallet_id'})
    wallet: CustomerWallet;

    @CreateDateColumn({ 
        type: 'datetime',
     })
    created_at: Date;

    @UpdateDateColumn({ 
        type: 'datetime',
     })
    updated_at: Date;

    @Column({ 
        type: 'datetime',
        default: null
     })
    deleted_at: Date;
}