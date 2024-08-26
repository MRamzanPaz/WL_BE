import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Plans } from "./plans.entites";


@Entity()

export class plans_Counties {

    @PrimaryGeneratedColumn()
    id:number;

    @Column({
        default: null,
        nullable: false
    })
    country_name: string;
    
    @Column({
        default: null,
        nullable: false
    })
    country_code: string;

    @Column({
        default: null,
        nullable: false
    })
    iso2: string;

    @Column({
        default: null,
        nullable: false
    })
    iso3: string;

    @Column({
        default: null,
        nullable: false
    })
    phone_code: string;

    @ManyToOne(() => Plans, (plan) => plan.countires)
    @JoinColumn({name: 'plan_id'})
    Plan: Plans

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