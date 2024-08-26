import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Countries } from "./country.entity";
import { Cities } from "./cities.entity";

@Entity()
export class States{
    
    @PrimaryGeneratedColumn({
        type: 'bigint'
    })
    id: number;

    @Column({
        nullable: false
    })
    state_name: string;

    @Column({
        nullable: false
    })
    state_code: string;

    @ManyToOne(()=> Countries, (country)=> country.states, {nullable: false})
    @JoinColumn({name:"country_id"})
    country: Countries;

    @OneToMany( ()=> Cities, (cities) => cities.state)
    cities: Cities[];

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