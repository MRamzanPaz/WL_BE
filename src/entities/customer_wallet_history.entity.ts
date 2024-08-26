import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CustomerWallet } from "./customer_wallet.entity";
import { EsimOrders } from "./esim-orders.entity";
import { Transactions } from "./transactions.entity";


@Entity()
export class CustomerWalletHistory{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: false,
        default: null
    })
    message: string;

    @Column({
        nullable: true,
        default: null,
        type: 'decimal',
        precision: 6,
        scale: 2
    })
    credit: number;
    
    @Column({
        nullable: true,
        default: null,
        type: 'decimal',
        precision: 6,
        scale: 2
    })
    debit: number;

    @ManyToOne(() => CustomerWallet, (account) => account.history)
    @JoinColumn({
        name: 'wallet_id'
    })
    wallet_id: CustomerWallet;

    @OneToOne(() => Transactions, {nullable: true})
    @JoinColumn({name: 'transaction_id',})
    transaction: Transactions;


    // @OneToOne(() => EsimOrders, {nullable: true})
    // @JoinColumn({name: 'order_id',})
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