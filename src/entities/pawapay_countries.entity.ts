import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PawapayNetworks } from "./pawapay_network.entity";

@Entity()
export class PawapayCountries {

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

    @ManyToMany(() => PawapayNetworks )
    @JoinTable({name: 'pawapay_networks'})
    pawapayNetwork: PawapayNetworks[];

}