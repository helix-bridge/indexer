import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule, Scalar } from '@nestjs/graphql';
import BigInt from 'apollo-type-bigint';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Substrate2substrateModule } from './substrate2substrate/substrate2substrate.module';

@Scalar('BigInt')
export class BigIntScalar extends BigInt {}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/graphql.ts'),
        outputAs: 'class',
      },
    }),
    Substrate2substrateModule,
  ],
  controllers: [AppController],
  providers: [AppService, BigIntScalar],
})
export class AppModule {}
