import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { States } from "./states.entity";

@Entity()
export class Countries{

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
        nullable: true,
        default: null
    })
    iso2: string;

    @Column({
        nullable: true,
        default: null
    })
    iso3: string

    @Column({
        nullable: true,
        default: null
    })
    phone_code: string;

    @Column({
        nullable: true,
        default: 10000
    })
    position: number;

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
    
    @OneToMany( ()=> States, (states) => states.country)
    states: States[];
}

