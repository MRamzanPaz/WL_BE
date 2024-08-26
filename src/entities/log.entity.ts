/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Logs {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: false,
        default: null
    })
    message: string;

    @Column({
        type: 'boolean',
        nullable: false
    })
    isError: Boolean;

    @Column({
        nullable: false
    })
    route: string;

    @Column({
        type: 'bigint',
        nullable: false
    })
    status_code: number;

    @CreateDateColumn({ 
        type: 'datetime',
     })
    created_at: Date;

}