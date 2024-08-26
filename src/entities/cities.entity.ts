import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { States } from "./states.entity";

@Entity()
export class Cities{
    @PrimaryGeneratedColumn({
        type: 'bigint'
    })
    id: number;

    @Column({
        nullable: false
    })
    city_name: string;

    @ManyToOne(()=> States, (state)=> state.cities, {eager: true})
    @JoinColumn({name:"state_id"})
    state: States;

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