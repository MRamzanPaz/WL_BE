import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Coupons } from "./coupon.entity";
import { EsimOrders } from "./esim-orders.entity";
import { TopupOrders } from "./topup-orders.entity";


@Entity()

export class CouponsDetails{

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Coupons, (user) => user.details)
    @JoinColumn({name: 'coupon_id'})
    coupon: Coupons;

    @OneToOne(() => EsimOrders)
    @JoinColumn({name: 'order_id'})
    order: EsimOrders;

    @OneToOne(() => EsimOrders)
    @JoinColumn({name: 'topup_id'})
    topup: TopupOrders;

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