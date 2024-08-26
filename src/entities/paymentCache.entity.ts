import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class PaymentCacheFW {

    @PrimaryGeneratedColumn()
    id:number;

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
        default: null,
        nullable: true
    })
    tr_ref: string;

    @Column({
        default: null,
        nullable: true
    })
    fw_ref: string;

    @Column({
        default: null,
        nullable: true
    })
    tr_id: number;

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