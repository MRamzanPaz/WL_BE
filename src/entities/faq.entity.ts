import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class FAQ{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: false,
        default: null,
        type: 'longtext'
    })
    question: string;

    @Column({
        nullable: false,
        default: null,
        type: 'longtext'
    })
    answer: string;

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