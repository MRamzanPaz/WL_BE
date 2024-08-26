import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EsimOrders } from "./esim-orders.entity";
import { MobileMoneyTransactions } from "./mobile_money_transactions.entity";


@Entity()
export class Transactions{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false
    })
    transaction_token: string;

    @Column({
        default: null,
        nullable: true
    })
    note: string;

    @Column({
        default: null,
        nullable: true
    })
    status: string;

    @Column({
        default: null,
        nullable: true
    })
    amount: string;

    @OneToOne(() => MobileMoneyTransactions, {nullable: true, eager: true})
    @JoinColumn({name: 'mobileMoney_id'})
    mobileMoney: MobileMoneyTransactions;

    // @OneToOne(() => EsimOrders)
    // @JoinColumn({name: 'order_id'})
    // order: EsimOrders;

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