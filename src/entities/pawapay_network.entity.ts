import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PawapayCountries } from "./pawapay_countries.entity";

@Entity()
export class PawapayNetworks {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: false
    })
    network: string;

    @Column({
        nullable: false,
        default: 0
    })
    transactionamount: number;

    @Column({
        nullable: false
    })
    transactionfee: string;

    @Column({
        nullable: false
    })
    transactionformula: string;

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

    @ManyToOne(() => PawapayCountries, (pawapayCountry) => pawapayCountry.pawapayNetwork)
    @JoinColumn({name: 'country_id'})
    pawapayCountry: PawapayCountries

}