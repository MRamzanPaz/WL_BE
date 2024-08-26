import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Plans } from "./plans.entites";
import { Customers } from "./customer.entity";
import { Transactions } from "./transactions.entity";


@Entity()
export class TopupOrders{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false,
    })
    iccid: string;

    @Column({
        default: null,
        nullable: true
    })
    order_by: number;

    
    @Column({
        default: null,
        nullable: true
    })
    order_no: string;

    @Column({
        default: null,
        nullable: true
    })
    coupon_code: string;

    @Column({
        default: 'PENDING',
        nullable: false
    })
    status: string;


    @ManyToOne(() => Plans, (plan) => plan.topups)
    @JoinColumn({name: 'plan_id'})
    plan: Plans;

    @ManyToOne(() => Customers, (customer) => customer.topups)
    @JoinColumn({name: 'customer_id'})
    customer: Customers;

    @OneToOne(() => Transactions)
    @JoinColumn({name: 'transaction_id'})
    transaction: Transactions;

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