import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PawapayTransactions {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: false
    })
    country_name: string;

    @Column({
        nullable: false
    })
    country_code: string;

    @Column({
        nullable: false
    })
    network: string;

    @Column({
        nullable: false,
        default: 0
    })
    transactionamount_KHS: number;

    @Column({
        nullable: false
    })
    transactionfee: string;

    @Column({
        nullable: false
    })
    transactionformula: string;

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