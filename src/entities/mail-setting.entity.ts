import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class EmailSetting{

    @PrimaryGeneratedColumn()
    id: number;

    @Column({default: null, nullable: true})
    logo_link: string;
    
    @Column({default: null, nullable: true})
    iOS_vedio_link: string;

    @Column({default: null, nullable: true})
    android_vedio_link: string;

    @Column({default: null, nullable:true})
    wl_name: string;

    @Column({default: null, nullable:true})
    wl_customer_dashbaord: string;
    
    @Column({default: false, nullable:false})
    showOrderPrice: Boolean;

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