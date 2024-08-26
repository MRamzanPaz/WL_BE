import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { plans_Counties } from './plans_countries.entity';
import { EsimOrders } from './esim-orders.entity';
import { TopupOrders } from './topup-orders.entity';
import { Countries } from './country.entity';

@Entity()
export class Plans {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    default: null,
    nullable: true,
  })
  name: string;

  @Column({
    default: null,
    nullable: true,
  })
  region: string;

  @Column({
    default: null,
    nullable: true,
  })
  data: string;

  @Column({
    default: null,
    nullable: true,
  })
  validity: string;

  @Column({
    default: null,
    nullable: true,
  })
  planType: string;

  @Column({
    default: null,
    nullable: true,
  })
  testPlan: boolean;

  @Column({
    default: null,

    nullable: true,
  })
  singleUse: boolean;

  @Column({
    default: null,
    nullable: true,
  })
  recharge_only: boolean;

  @Column({
    default: null,
    nullable: true,
  })
  global_plan: boolean;

  @Column({
    default: null,
    nullable: true,
  })
  price: string;

  @Column({
    default: null,
    nullable: true,
  })
  cost_price: string;

  @Column({
    default: null,
    nullable: true,
  })
  package_id: number;

  @Column({
    default: false,
    nullable: true,
  })
  isRegional: boolean;

  @Column({
    nullable: true,
    default: null,
  })
  msisdn: string;

  @Column({
    nullable: true,
    default: null,
  })
  voicemail_system: string;

  @Column({
    nullable: true,
    default: null,
  })
  state: string;

  @Column({
    nullable: true,
    default: null,
  })
  rate_center: string;
  @Column({
    nullable: true,
    default: null,
  })
  description: string;
  @ManyToMany(() => Countries)
  @JoinTable({ name: 'countries_of_plans' })
  countires: Countries[];

  // @OneToMany(() => plans_Counties, (countries) => countries.Plan, {eager: true})
  // countires: plans_Counties[]

  @OneToMany(() => EsimOrders, (order) => order.plan)
  orders: EsimOrders[];

  @OneToMany(() => TopupOrders, (order) => order.plan)
  topups: TopupOrders[];

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
    default: null,
    nullable: true,
  })
  deleted_at: Date;
}
