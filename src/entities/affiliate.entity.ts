import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Affiliate {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        default: null,
        nullable: false
    })
    fullName: string;

    @Column({
        default: null,
        nullable: false
    })
    email: string;

    @Column({
        default: null,
        nullable: false
    })
    phone: string;

    @Column({
        default: null,
        nullable: false
    })
    companyName: string;

    @Column({
        default: null
    })
    affiliateUrl: string;

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