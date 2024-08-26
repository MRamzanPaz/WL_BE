import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CouponsDetails } from "./couponsDetails.entity";


@Entity()
export class Coupons{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
    })
    name: string;

    @Column({
        default: null,
    })
    start_date: Date;

    @Column({
        default: null,
    })
    expiry_date: Date

    @Column({
        default: null,
    })
    isFixed: Boolean;

    @Column({
        default: null,
    })
    noOfUse: number;

    @Column({
        default: null,
    })
    remainingUse: number;

    @Column({
        default: null,
    })
    discount: number;

    @Column({
        default: null,
    })
    systemGenerated: Boolean;

    @Column({
        default: null,
    })
    couponCode: string;

    @OneToMany(() => CouponsDetails, (photo) => photo.coupon)
    details: CouponsDetails[]

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