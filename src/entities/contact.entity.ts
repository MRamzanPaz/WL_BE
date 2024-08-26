import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Contact {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false
    })
    firstName: string;

    @Column({
        default: null,
        nullable: false
    })
    lastName: string;

    @Column({
        default: null,
        nullable: false,
    })
    email: string;

    @Column({
        default: null,
        nullable: false,
    })
    subject: string;

    @Column({
        default: null,
    })
    concerning: string;

    @Column({
        default: null,
    })
    message: string;

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