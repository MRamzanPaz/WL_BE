import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EsimOrders } from "./esim-orders.entity";


@Entity()
export class PawaPayRefunds {

    @PrimaryGeneratedColumn()
    id: number;

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

    @Column({
        default: null,
        nullable: false
    })
    refund_id: string

    @Column({
        default: null,
        nullable: false
    })
    status: string

    @OneToOne(() => EsimOrders)
    @JoinColumn({name: 'order_id'})
    order: EsimOrders

}