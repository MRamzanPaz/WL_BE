import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class CustomerVerification {
    @PrimaryGeneratedColumn()
    id: number;

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

    @Column({
        default: null,
        nullable: false,
    })
    email: string;

    @Column({
        default: null,
        nullable: true
    })
    otp_code: string;

    @Column({
        default: null,
        nullable: false
    })
    isVerified: boolean;
}