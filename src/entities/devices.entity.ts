import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class Devices{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null
    })
    model: string;

    @Column({
        default: null
    })
    os: string;

    @Column({
        default: null
    })
    brand: string;

    @Column({
        default: null
    })
    name: string;


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