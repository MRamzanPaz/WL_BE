import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EsimOrders } from "./esim-orders.entity";

@Entity()
export class RefundActivities {

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
    status: string;

    @Column({
        default: null,
        nullable: false
    })
    note: string;

    @Column({
        default: null,
        nullable: false
    })
    order_no: string;

    @ManyToOne(() => EsimOrders, (order) => order.refunds)
    @JoinColumn({name: 'order_id'})
    order: EsimOrders

}