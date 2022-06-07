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
import { Crab2smartModule } from './crab2smart/crab2smart.module';
import { Darwinia2crabModule } from './darwinia2crab/darwinia2crab.module';
import { Substrate2substrateModule } from './substrate2substrate/substrate2substrate.module';
import { TasksModule } from './tasks/tasks.module';

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
    Substrate2substrateModule,
    AccountModule,
    ConfigModule.forRoot({
      envFilePath: ['.env', chainEnvFilePath],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TasksModule,
    AggregationModule,
    Darwinia2crabModule,
    Crab2smartModule,
  ],
  controllers: [AppController],
  providers: [AppService, BigIntScalar],
})
export class AppModule {}
