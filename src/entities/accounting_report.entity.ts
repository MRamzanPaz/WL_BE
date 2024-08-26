import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class AccountingReport {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: true
    })
    order_date: string;

    @Column({
        default: null,
        nullable: true
    })
    order_time: string;

    @Column({
        default: null,
        nullable: true
    })
    order_code: string;

    @Column({
        default: null,
        nullable: true
    })
    transaction_id: number;

    @Column({
        default: null,
        nullable: true
    })
    customer_fullname: string;

    @Column({
        default: null,
        nullable: true
    })
    customer_email: string;

    @Column({
        default: null,
        nullable: false
    })
    iccId: string;

    @Column({
        default: null,
        nullable: true
    })
    plan_name: string;

    @Column({
        default: null,
        nullable: false
    })
    data: string;

    @Column({
        default: null,
        nullable: false
    })
    validity: string;

    @Column({
        default: null,
        nullable: true
    })
    sale_price_inc_VAT: string;

    @Column({
        default: null,
        nullable: true
    })
    sale_price_excl_VAT: string;

    @Column({
        default: null,
        nullable: true
    })
    coupon_code: string;

    @Column({
        default: null,
        nullable: true
    })
    disc_from_coupon_code: string;

    @Column({
        default: null,
        nullable: true
    })
    amount_paid: string;

    @Column({
        default: null,
        nullable: true
    })
    cost_price: string;

    @Column({
        default: null,
        nullable: false
    })
    payment_mode: string;

    @Column({
        default: null,
        nullable: true
    })
    payment_tx_fee: string;

    @Column({
        default: null,
        nullable: true
    })
    profit: string;

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