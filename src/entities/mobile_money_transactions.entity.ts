import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class MobileMoneyTransactions{

    @PrimaryGeneratedColumn()
    id:number;

    @Column({
        default: null,
        nullable: false
    })
    phone_number: string;

    @Column({
        default: null,
        nullable: true
    })
    currency: string;

    @Column({
        default: null,
        nullable: false
    })
    tr_ref: string; // transaction reference

    @Column({
        default: null,
        nullable: false
    })
    status: string; 

    @Column({
        default: null,
        nullable: true
    })
    network: string;

    @Column({
        default: null,
        nullable: true
    })
    country_code: string

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