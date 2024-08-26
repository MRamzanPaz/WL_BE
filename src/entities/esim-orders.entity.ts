import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Customers } from "./customer.entity";
import { Plans } from "./plans.entites";
import { Transactions } from "./transactions.entity";
import { RefundActivities } from "./refundActivities.entity";


@Entity()
export class EsimOrders{
    
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Customers, (customer) => customer.orders)
    @JoinColumn({name: 'customer_id'})
    customer: Customers;


    @ManyToOne(() => Plans, (plan) => plan.orders)
    @JoinColumn({name: 'plan_id'})
    plan: Plans;

    @OneToOne(() => Transactions)
    @JoinColumn({name: 'transaction_id'})
    transaction: Transactions;

    @OneToMany(() => RefundActivities, (refund) => refund.order)
    refunds: RefundActivities[]

    @Column({
        default: null,
        nullable: true
    })
    status: string;

    @Column({
        default: null,
        nullable: true
    })
    order_code: string;

    @Column({
        default: null,
        nullable: true
    })
    couponCode: string;

    @Column({
        default: null,
        nullable: true
    })
    affiliateCode: string;

    @Column({
        default: null,
        nullable: true
    })
    device_os: string;

    @Column({
        default: null,
        nullable: true
    })
    device_name: string;


    @Column({
        default: null,
        nullable: true
    })
    order_by: number;

    @Column({
        default: null,
        nullable: true
    })
    iccid: string;

    @Column({
        default: null,
        nullable: true
    })
    qr_code: string;

    @Column({
        default: null,
        nullable: true
    })
    qrcode_url: string;

    @Column({
        default: null,
        nullable: true
    })
    apn: string;

    @Column({
        default: null,
        nullable: true
    })
    data_roaming: string;

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