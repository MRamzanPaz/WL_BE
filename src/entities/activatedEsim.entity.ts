import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Customers } from "./customer.entity";

@Entity()
export class ActivatedESims{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false
    })
    iccid: string;

    @ManyToOne(() => Customers, (cs) => cs.activated_esims)
    @JoinColumn({name: 'customer_id'})
    customer: Customers;

    @Column({
        default: true,
        nullable: false
    })
    singleUse: Boolean;

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