import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CustomerWalletHistory } from "./customer_wallet_history.entity";


@Entity()
export class CustomerWallet{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'decimal',
        default: 0,
        precision: 6,
        scale: 2
    })
    wallet_balance: number;

    @OneToMany(() => CustomerWalletHistory, (transactions) => transactions.wallet_id)
    history: CustomerWalletHistory[]

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