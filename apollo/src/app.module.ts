import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule, Scalar } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import BigInt from 'apollo-type-bigint';
import { join } from 'path';
import { AccountModule } from './account/account.module';
import { AggregationModule } from './aggregation/aggregation.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { CbridgeModule } from './cbridge/cbridge.module';
import { StatisticModule } from './statistic/statistic.module';
import { XcmModule } from './xcm/xcm.module';
import { Sub2ethv2Module } from './sub2ethv2/sub2ethv2.module';
import { S2sv21Module } from './s2sv21/s2sv21.module';
import { LpbridgeModule } from './lpbridge/lpbridge.module';
import { L2arbitrumModule } from './l2arbitrum/l2arbitrum.module';

const chainEnvFilePath = `.env.${process.env.NODE_ENV || 'prod'}`;

@Scalar('BigInt')
export class BigIntScalar extends BigInt {}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./src/**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'),
        outputAs: 'class',
      },
    }),
    AccountModule,
    ConfigModule.forRoot({
      envFilePath: ['.env', chainEnvFilePath],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TasksModule,
    AggregationModule,
    CbridgeModule,
    StatisticModule,
    XcmModule,
    Sub2ethv2Module,
    LpbridgeModule,
    //S2sv21Module,
    L2arbitrumModule,
  ],
  controllers: [AppController],
  providers: [AppService, BigIntScalar],
})
export class AppModule {}
